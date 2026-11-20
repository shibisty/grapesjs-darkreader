/**
 * The runtime of the published pages.
 *
 * `bootRuntime` is serialised with `Function.prototype.toString()` into the
 * exported HTML (the toggle component's export script and the `<script>`
 * added to `editor.getHtml()`), so it must be self-contained: no imports,
 * no outer variables, plain ES5 (it runs on the visitor's browser as is).
 *
 * It creates `window.gjsTheme` once per page:
 *   get()        → 'dark' | 'light' (the scheme shown)
 *   isGenerated()→ is the generated theme on
 *   set(v)       → 'dark' | 'light' | 'original' | 'generated' | 'system'
 *   toggle()
 *   bind(el)     → makes an element a toggle (click; aria-pressed = dark)
 *   on(fn)       → fn({ scheme, generated }) on every change
 * and marks `<html data-gjs-theme="dark|light">`. Dark Reader itself is
 * loaded from `cfg.src` only when the generated theme is needed.
 */
import type { DarkReaderFixes, DarkReaderTheme, InitialTheme, SiteScheme } from './settings';


export interface RuntimeConfig {
  /** false: the theme is switched off (toggles do nothing). */
  on: boolean;
  /** URL of darkreader.js (UMD, `window.DarkReader`). */
  src: string;
  /** The original design. */
  scheme: SiteScheme;
  /** The generated one (the opposite). */
  generated: SiteScheme;
  initial: InitialTheme;
  remember: boolean;
  /** localStorage key of the visitor's choice. */
  key: string;
  /** Hide the page until the generated theme is applied on load (no flash of the original colours). */
  antiFlash: boolean;
  /** Background shown meanwhile. */
  flashBackground: string;
  /** `'filter'`: the theme is `filterCss` (no Dark Reader download). */
  engine: 'dynamic' | 'filter';
  filterCss: string;
  theme: DarkReaderTheme;
  fixes: DarkReaderFixes;
}

/* eslint-disable no-var */
export function bootRuntime(cfg: RuntimeConfig, el?: Element | null): void {
  var w = window as any;
  var d = document;
  var api = w.gjsTheme;
  if (!cfg) return;
  if (!api) {
    var fe: any = null;
    try {
      fe = w.frameElement;
    } catch (e) {
      fe = null;
    }
    // Inside the GrapesJS canvas the editor plugin drives the preview.
    if (fe && (' ' + fe.className + ' ').indexOf(' gjs-frame ') >= 0) return;
    if (!cfg.on) return;

    var root = d.documentElement;
    var mq = w.matchMedia ? w.matchMedia('(prefers-color-scheme: dark)') : null;
    var state = { generated: false, choice: null as string | null, started: false };
    var toggles: Element[] = [];
    var listeners: Array<(e: { scheme: string; generated: boolean }) => void> = [];
    var waiting: Array<() => void> | null = null;
    var flashEl: HTMLStyleElement | null = null;
    var flashTimer: any = 0;

    var read = function (): string | null {
      if (!cfg.remember) return null;
      try {
        var v = w.localStorage.getItem(cfg.key);
        return v === 'original' || v === 'generated' ? v : null;
      } catch (e) {
        return null;
      }
    };
    var write = function (v: string | null): void {
      if (!cfg.remember) return;
      try {
        if (v) w.localStorage.setItem(cfg.key, v);
        else w.localStorage.removeItem(cfg.key);
      } catch (e) {
        /* storage disabled */
      }
    };
    var wanted = function (): boolean {
      var c = state.choice || (cfg.initial === 'system' ? null : cfg.initial);
      if (c) return c === 'generated';
      var dark = !!(mq && mq.matches);
      return dark === (cfg.generated === 'dark');
    };
    var scheme = function (): string {
      return state.generated ? cfg.generated : cfg.scheme;
    };
    var unflash = function (): void {
      clearTimeout(flashTimer);
      if (flashEl && flashEl.parentNode) flashEl.parentNode.removeChild(flashEl);
      flashEl = null;
    };
    var flash = function (): void {
      if (!cfg.antiFlash || flashEl || w.DarkReader) return;
      flashEl = d.createElement('style');
      flashEl.setAttribute('data-gjs-theme-flash', '');
      flashEl.textContent =
        'html{background:' + cfg.flashBackground + ' !important}body{visibility:hidden !important}';
      (d.head || root).appendChild(flashEl);
      flashTimer = setTimeout(unflash, 3000);
    };
    var load = function (cb: () => void): void {
      if (w.DarkReader) return cb();
      if (waiting) {
        waiting.push(cb);
        return;
      }
      waiting = [cb];
      var s = d.createElement('script');
      s.src = cfg.src;
      s.async = true;
      s.setAttribute('data-gjs-theme-engine', '');
      s.onload = function () {
        var q = waiting || [];
        waiting = null;
        for (var i = 0; i < q.length; i++) q[i]();
      };
      s.onerror = function () {
        waiting = null;
        unflash();
      };
      (d.head || root).appendChild(s);
    };
    var mark = function (): void {
      var sc = scheme();
      root.setAttribute('data-gjs-theme', sc);
      for (var i = 0; i < toggles.length; i++) toggles[i].setAttribute('aria-pressed', sc === 'dark' ? 'true' : 'false');
      for (var j = 0; j < listeners.length; j++) {
        try {
          listeners[j]({ scheme: sc, generated: state.generated });
        } catch (e) {
          /* a listener failed */
        }
      }
    };
    var filterEl: HTMLStyleElement | null = null;
    var apply = function (gen: boolean, first?: boolean): void {
      state.generated = gen;
      mark();
      if (cfg.engine === 'filter') {
        if (gen && !filterEl) {
          filterEl = d.createElement('style');
          filterEl.setAttribute('data-gjs-theme-filter', '');
          filterEl.textContent = cfg.filterCss;
          (d.head || root).appendChild(filterEl);
        } else if (!gen && filterEl) {
          if (filterEl.parentNode) filterEl.parentNode.removeChild(filterEl);
          filterEl = null;
        }
        return;
      }
      if (gen) {
        if (first) flash();
        load(function () {
          if (!state.generated) return unflash();
          try {
            w.DarkReader.enable(cfg.theme, cfg.fixes);
          } catch (e) {
            /* engine failed: keep the original */
          }
          unflash();
        });
      } else {
        unflash();
        if (w.DarkReader) {
          try {
            w.DarkReader.disable();
          } catch (e) {
            /* ignore */
          }
        }
      }
    };

    api = w.gjsTheme = {
      config: cfg,
      get: scheme,
      isGenerated: function () {
        return state.generated;
      },
      set: function (v: string) {
        if (v === 'system') state.choice = null;
        else if (v === 'original' || v === 'generated') state.choice = v;
        else if (v === 'dark' || v === 'light') state.choice = v === cfg.generated ? 'generated' : 'original';
        else return;
        write(state.choice);
        if (wanted() !== state.generated) apply(wanted());
      },
      toggle: function () {
        api.set(state.generated ? 'original' : 'generated');
      },
      bind: function (t: Element) {
        if (!t || (t as any).__gjsThemeBound) return;
        (t as any).__gjsThemeBound = true;
        toggles.push(t);
        t.setAttribute('aria-pressed', scheme() === 'dark' ? 'true' : 'false');
        t.addEventListener('click', function (e: Event) {
          e.preventDefault();
          api.toggle();
        });
      },
      on: function (fn: (e: { scheme: string; generated: boolean }) => void) {
        listeners.push(fn);
        return function () {
          var i = listeners.indexOf(fn);
          if (i >= 0) listeners.splice(i, 1);
        };
      },
    };

    state.choice = read();
    if (mq) {
      var onScheme = function () {
        if (!state.choice && cfg.initial === 'system' && wanted() !== state.generated) apply(wanted());
      };
      if (mq.addEventListener) mq.addEventListener('change', onScheme);
      else if (mq.addListener) mq.addListener(onScheme);
    }
    apply(wanted(), true);
    var bindAll = function () {
      var list = d.querySelectorAll('[data-gjs-theme-toggle]');
      for (var i = 0; i < list.length; i++) api.bind(list[i]);
    };
    if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', bindAll);
    else bindAll();
  }
  if (el && api && api.bind) api.bind(el);
}
/* eslint-enable no-var */

/** Source of `bootRuntime` as an expression: `(function …)`. */
export const runtimeSource = (): string => `(${bootRuntime.toString()})`;

/** `<script>` for the page (head or end of body): starts the runtime. */
export function runtimeScriptTag(cfg: RuntimeConfig): string {
  const json = JSON.stringify(cfg).replace(/</g, '\\u003c');
  return `<script data-gjs-theme-runtime>${runtimeSource()}(${json});</script>`;
}

/** The toggle component's export script (GrapesJS `script-export`, with `script-props`). */
export const exportScript = (): string => `function(props){${runtimeSource()}(props && props.config, this);}`;

/**
 * The toggle component's script in the canvas: clicks go to the editor
 * plugin (it switches the preview, only in the preview mode).
 */
export const canvasScript = (): string =>
  "function(){var el=this;if(el.__gjsThemeBound)return;el.__gjsThemeBound=1;el.addEventListener('click',function(e){var fe=null;try{fe=window.frameElement}catch(x){}var c=fe&&fe.__gjsDarkReader;if(c)c.click(e,el);});}";
