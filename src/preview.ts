/**
 * Preview of the generated theme in the canvas: darkreader.js is loaded
 * into each canvas frame and `DarkReader.enable(theme, fixes)` is called
 * there (the engine works on its own window's document only).
 *
 * The iframe element gets `__gjsDarkReader` — the toggle component's canvas
 * script sends its clicks there (they switch the preview in the preview mode).
 */
import type { Editor } from 'grapesjs';
import { effectiveEngine, filterCss, generatedScheme, toDarkReader, type ThemeSettings } from './settings';

export interface PreviewHost {
  editor: Editor;
  settings(): ThemeSettings;
  src(): string;
  /** The preview was switched on/off from the canvas (toggle click in preview mode). */
  onToggle(on: boolean): void;
  /** darkreader.js failed to load (or to run). */
  onError(err: unknown): void;
}

interface FrameWin extends Window {
  DarkReader?: {
    enable(theme: unknown, fixes?: unknown): void;
    disable(): void;
    isEnabled(): boolean;
    exportGeneratedCSS(): Promise<string>;
  };
}

/** Frame handle the canvas script calls. */
export interface FrameHandle {
  click(e: Event, el: Element): void;
}

/**
 * GrapesJS edits the DOM of a text component in place (RTE): inline styles
 * Dark Reader rewrote there must not leak into the model.
 */
export const EDITING_IGNORE = ['[contenteditable="true"]', '[contenteditable="true"] *'];

export class Preview {
  private on = false;
  private readonly loading = new WeakMap<Document, Promise<void>>();
  private readonly handle: FrameHandle;

  constructor(private readonly host: PreviewHost) {
    this.handle = {
      click: (e) => {
        // Only in the preview mode: otherwise a click selects the component.
        if (!this.host.editor.Commands.isActive('preview')) return;
        e.preventDefault();
        this.host.onToggle(!this.on);
      },
    };
  }

  isOn(): boolean {
    return this.on;
  }

  setOn(on: boolean): Promise<void> {
    this.on = !!on;
    return this.refresh();
  }

  /** Canvas frames: iframe elements. */
  frames(): HTMLIFrameElement[] {
    const out: HTMLIFrameElement[] = [];
    const Canvas: any = this.host.editor.Canvas;
    try {
      (Canvas.getFrames?.() || []).forEach((f: any) => {
        const el = f?.view?.el;
        if (el && el.tagName === 'IFRAME') out.push(el);
      });
    } catch {
      /* no frames yet */
    }
    if (!out.length) {
      const el = Canvas.getFrameEl?.() as HTMLIFrameElement | undefined;
      if (el) out.push(el);
    }
    return out;
  }

  /** (Re)applies the state and the settings to every frame. */
  async refresh(): Promise<void> {
    await Promise.all(this.frames().map((f) => this.apply(f)));
  }

  /** Applies to one frame (also on `canvas:frame:load`). */
  async apply(frame: HTMLIFrameElement): Promise<void> {
    (frame as any).__gjsDarkReader = this.handle;
    const win = frame.contentWindow as FrameWin | null;
    const doc = frame.contentDocument;
    if (!win || !doc || !doc.documentElement) return;
    const s = this.host.settings();
    const want = this.on;
    this.mark(doc, want ? generatedScheme(s) : s.scheme, want);
    const filter = want && effectiveEngine(s) === 'filter';
    this.setFilter(doc, filter ? filterCss(s) : null);
    if (!want || filter) {
      if (win.DarkReader?.isEnabled?.()) this.safe(() => win.DarkReader!.disable());
      return;
    }
    try {
      await this.load(win, doc);
    } catch (e) {
      this.host.onError(e);
      return;
    }
    const now = this.host.settings();
    if (!this.on || effectiveEngine(now) === 'filter') return; // changed meanwhile
    const { theme, fixes } = toDarkReader(this.host.settings(), { ignoreInlineStyle: EDITING_IGNORE, css: this.frameCss() });
    this.safe(() => win.DarkReader!.enable(theme, fixes));
  }

  /** The CSS of the generated theme for the (first) frame, when the preview is on. */
  async exportCss(): Promise<string> {
    if (!this.on) return '';
    const s = this.host.settings();
    if (effectiveEngine(s) === 'filter') return filterCss(s);
    const f = this.frames()[0];
    const win = f?.contentWindow as FrameWin | null;
    if (!win?.DarkReader?.isEnabled?.()) return '';
    return win.DarkReader.exportGeneratedCSS();
  }

  /** The filter engine's `<style>` in a frame (`null` removes it). */
  private setFilter(doc: Document, css: string | null): void {
    let el = doc.querySelector<HTMLStyleElement>('style[data-gjs-darkreader-filter]');
    if (css === null) {
      el?.remove();
      return;
    }
    if (!el) {
      el = doc.createElement('style');
      el.setAttribute('data-gjs-darkreader-filter', '');
      (doc.head || doc.documentElement).appendChild(el);
    }
    if (el.textContent !== css) el.textContent = css;
  }

  /**
   * In a frame Dark Reader leaves the page background to the parent
   * window; the published page is the top window, where it paints it.
   * The same here, so the preview matches.
   */
  private frameCss(): string {
    const s = this.host.settings();
    const bg = generatedScheme(s) === 'dark' ? s.darkBackground : s.lightBackground;
    const fg = generatedScheme(s) === 'dark' ? s.darkText : s.lightText;
    return `html{background-color:${bg} !important}\nhtml,body{background-color:${bg};color:${fg}}`;
  }

  /** `<html data-gjs-theme>` and the toggles' state in the frame, as on the site. */
  private mark(doc: Document, scheme: string, generated: boolean): void {
    doc.documentElement.setAttribute('data-gjs-theme', scheme);
    doc.documentElement.toggleAttribute('data-gjs-theme-generated', generated);
    doc.querySelectorAll('[data-gjs-theme-toggle]').forEach((el) => el.setAttribute('aria-pressed', scheme === 'dark' ? 'true' : 'false'));
  }

  private load(win: FrameWin, doc: Document): Promise<void> {
    patchRealm(win, doc.defaultView?.parent || window);
    if (win.DarkReader) return Promise.resolve();
    let p = this.loading.get(doc);
    if (p) return p;
    p = new Promise<void>((resolve, reject) => {
      const s = doc.createElement('script');
      s.src = this.host.src();
      s.setAttribute('data-gjs-darkreader', '');
      s.onload = () => (win.DarkReader ? resolve() : reject(new Error('darkreader.js loaded, but window.DarkReader is missing')));
      s.onerror = () => reject(new Error(`darkreader.js not loaded: ${s.src}`));
      (doc.head || doc.documentElement).appendChild(s);
    });
    p.catch(() => this.loading.delete(doc));
    this.loading.set(doc, p);
    return p;
  }

  private safe(fn: () => void): void {
    try {
      fn();
    } catch (e) {
      this.host.onError(e);
    }
  }

  destroy(): void {
    this.on = false;
    this.frames().forEach((f) => {
      delete (f as any).__gjsDarkReader;
      if (f.contentDocument) this.setFilter(f.contentDocument, null);
      const win = f.contentWindow as FrameWin | null;
      if (win?.DarkReader?.isEnabled?.()) this.safe(() => win.DarkReader!.disable());
    });
  }
}

/**
 * GrapesJS builds the canvas DOM with the editor's `document`, so the
 * elements in the frame belong to the editor window: `el instanceof
 * HTMLStyleElement` is false for them in the frame's realm, and Dark
 * Reader (running in the frame) would skip every style and element.
 * `Symbol.hasInstance` on the frame's DOM / CSSOM roots also accepts the
 * same-named classes of the editor window (inherited by every subclass).
 */
export function patchRealm(win: Window, parent: Window): boolean {
  const w = win as any;
  const p = parent as any;
  if (!w || !p || w === p || w.__gjsDarkReaderRealm) return false;
  const native = Function.prototype[Symbol.hasInstance];
  const hasInstance = function (this: any, o: unknown): boolean {
    if (native.call(this, o)) return true;
    const other = this && typeof this.name === 'string' ? p[this.name] : null;
    return typeof other === 'function' && other !== this && native.call(other, o);
  };
  ['Node', 'CSSRule', 'StyleSheet', 'CSSStyleDeclaration'].forEach((name) => {
    const C = w[name];
    if (typeof C !== 'function') return;
    try {
      Object.defineProperty(C, Symbol.hasInstance, { value: hasInstance, configurable: true });
    } catch {
      /* frozen */
    }
  });
  Object.defineProperty(w, '__gjsDarkReaderRealm', { value: true });
  return true;
}

/* ------------------------------------------------------------------ model hygiene */

const DR_ATTR = /^data-darkreader/i;
const DR_PROP = /^--darkreader/i;

/**
 * Removes what Dark Reader writes into the DOM (`data-darkreader-*`
 * attributes, `--darkreader-*` inline properties) from a component and its
 * children, in case the RTE synced it into the model. Returns how many
 * components were cleaned.
 */
export function sanitizeComponent(cmp: any): number {
  let n = 0;
  const visit = (c: any) => {
    if (!c || typeof c.getAttributes !== 'function') return;
    let dirty = false;
    const attrs = c.getAttributes() || {};
    const bad = Object.keys(attrs).filter((k) => DR_ATTR.test(k));
    if (bad.length) {
      bad.forEach((k) => c.removeAttributes ? c.removeAttributes(k) : c.addAttributes({ [k]: undefined }));
      dirty = true;
    }
    // Inline style kept as an attribute (avoidInlineStyle: false) or the component style.
    const style = typeof attrs.style === 'string' ? attrs.style : '';
    if (style && /--darkreader/i.test(style)) {
      const clean = style
        .split(';')
        .filter((d: string) => d.trim() && !DR_PROP.test(d.trim()))
        .join(';');
      c.addAttributes({ style: clean });
      dirty = true;
    }
    try {
      const st = c.getStyle?.() || {};
      const badProps = Object.keys(st).filter((k) => DR_PROP.test(k));
      if (badProps.length) {
        const next = { ...st };
        badProps.forEach((k) => delete next[k]);
        c.setStyle(next);
        dirty = true;
      }
    } catch {
      /* no style */
    }
    if (dirty) n++;
    c.components?.().forEach?.((ch: any) => visit(ch));
  };
  visit(cmp);
  return n;
}
