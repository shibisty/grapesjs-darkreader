/**
 * The "Theme" tab: preview switch and every setting of the generated theme.
 */
import type { DarkReaderLabels } from './options';
import { generatedScheme, type ThemeSettings } from './settings';

export interface PanelHost {
  settings(): ThemeSettings;
  update(patch: Partial<ThemeSettings>): void;
  reset(): void;
  isPreview(): boolean;
  setPreview(on: boolean): void;
  addToggle(): void;
  copyCss(): Promise<boolean>;
  /** Selector of the selected component (for the fixes), if any. */
  selectedSelector(): string | null;
  labels(): DarkReaderLabels;
}

type Attrs = Record<string, string | number | boolean | undefined | null | ((e: Event) => void)>;

function h<K extends keyof HTMLElementTagNameMap>(doc: Document, tag: K, attrs: Attrs = {}, ...kids: Array<Node | string | null | false>): HTMLElementTagNameMap[K] {
  const el = doc.createElement(tag);
  Object.keys(attrs).forEach((k) => {
    const v = attrs[k];
    if (v === undefined || v === null || v === false) return;
    if (typeof v === 'function') el.addEventListener(k.replace(/^on/, ''), v as EventListener);
    else if (k === 'class') el.className = String(v);
    else if (k === 'value') (el as any).value = String(v);
    else if (k === 'checked') (el as any).checked = !!v;
    else el.setAttribute(k, v === true ? '' : String(v));
  });
  kids.forEach((c) => c && el.append(c));
  return el;
}

const HEX = /^#[0-9a-f]{6}$/i;
const toHex = (c: string): string => {
  if (HEX.test(c)) return c;
  const m = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(c);
  return m ? `#${m[1]}${m[1]}${m[2]}${m[2]}${m[3]}${m[3]}` : '#808080';
};

export class ThemePanel {
  readonly root: HTMLElement;
  private error = '';

  constructor(
    private readonly doc: Document,
    private readonly host: PanelHost,
  ) {
    this.root = doc.createElement('div');
    this.root.className = 'gjs-dr';
    this.root.setAttribute('data-gjs-darkreader-panel', '');
    this.render();
  }

  setError(msg: string): void {
    this.error = msg;
    this.render();
  }

  /** Re-renders (settings loaded, labels changed). Keeps focus/scroll where possible. */
  render(): void {
    const scroll = this.root.scrollTop;
    const active = this.doc.activeElement as HTMLElement | null;
    const focusKey = active && this.root.contains(active) ? active.getAttribute('data-k') : null;
    this.root.textContent = '';
    this.root.append(...this.build());
    this.root.classList.toggle('gjs-dr-off', !this.host.settings().enabled);
    this.root.scrollTop = scroll;
    if (focusKey) (this.root.querySelector(`[data-k="${focusKey}"]`) as HTMLElement | null)?.focus();
  }

  private build(): Node[] {
    const d = this.doc;
    const L = this.host.labels();
    const s = this.host.settings();
    const set = (patch: Partial<ThemeSettings>, rerender = false) => {
      this.host.update(patch);
      if (rerender) this.render();
      else this.root.classList.toggle('gjs-dr-off', !this.host.settings().enabled);
    };
    const gen = generatedScheme(s);
    const preview = this.host.isPreview();

    const seg = h(
      d,
      'div',
      { class: 'gjs-dr-seg', role: 'group', 'aria-label': L.preview },
      h(d, 'button', { type: 'button', 'data-k': 'pv-orig', class: preview ? '' : 'is-on', 'aria-pressed': String(!preview), onclick: () => this.preview(false) }, L.previewOriginal),
      h(d, 'button', { type: 'button', 'data-k': 'pv-gen', class: preview ? 'is-on' : '', 'aria-pressed': String(preview), onclick: () => this.preview(true) }, L.previewGenerated),
    );

    const check = (key: 'enabled' | 'remember', label: string, rerender = false) =>
      h(d, 'label', { class: 'gjs-dr-check' }, h(d, 'input', { type: 'checkbox', 'data-k': key, checked: s[key], onchange: (e) => set({ [key]: (e.target as HTMLInputElement).checked }, rerender) }), h(d, 'span', {}, label));

    const select = (key: 'scheme' | 'initial' | 'engine', label: string, options: Array<[string, string]>) =>
      h(
        d,
        'div',
        { class: 'gjs-dr-row gjs-dr-row--stack' },
        h(d, 'label', { for: `gjs-dr-${key}` }, label),
        h(
          d,
          'select',
          { id: `gjs-dr-${key}`, 'data-k': key, onchange: (e) => set({ [key]: (e.target as HTMLSelectElement).value } as Partial<ThemeSettings>, true) },
          ...options.map(([v, t]) => h(d, 'option', { value: v, selected: s[key] === v }, t)),
        ),
      );

    const range = (key: 'brightness' | 'contrast' | 'sepia' | 'grayscale', label: string, min: number, max: number) => {
      const out = h(d, 'output', {}, `${s[key]}%`);
      return h(
        d,
        'div',
        { class: 'gjs-dr-row' },
        h(d, 'label', { for: `gjs-dr-${key}` }, label),
        h(
          d,
          'div',
          { class: 'gjs-dr-range' },
          h(d, 'input', {
            type: 'range',
            id: `gjs-dr-${key}`,
            'data-k': key,
            min,
            max,
            step: 1,
            value: s[key],
            oninput: (e) => {
              const v = Number((e.target as HTMLInputElement).value);
              out.textContent = `${v}%`;
              set({ [key]: v });
            },
            ondblclick: () => set({ [key]: key === 'sepia' || key === 'grayscale' ? 0 : 100 }, true),
          }),
          out,
        ),
      );
    };

    const colorInput = (key: keyof ThemeSettings, value: string, onSet: (v: string) => void) => {
      const text = h(d, 'input', {
        type: 'text',
        'data-k': `${key}-t`,
        value,
        spellcheck: 'false',
        onchange: (e) => onSet((e.target as HTMLInputElement).value),
      });
      const pick = h(d, 'input', {
        type: 'color',
        'data-k': `${key}-c`,
        value: toHex(value),
        oninput: (e) => {
          text.value = (e.target as HTMLInputElement).value;
          onSet(text.value);
        },
      });
      return [pick, text];
    };

    const color = (key: 'darkBackground' | 'darkText' | 'lightBackground' | 'lightText', label: string) =>
      h(d, 'div', { class: 'gjs-dr-row' }, h(d, 'span', { class: 'gjs-dr-l' }, label), h(d, 'div', { class: 'gjs-dr-color' }, ...colorInput(key, s[key], (v) => set({ [key]: v }))));

    const special = (key: 'selectionColor' | 'scrollbarColor', label: string) => {
      const v = s[key];
      const mode = v === 'auto' ? 'auto' : v === '' ? 'default' : 'custom';
      return h(
        d,
        'div',
        { class: 'gjs-dr-row' },
        h(d, 'span', { class: 'gjs-dr-l' }, label),
        h(
          d,
          'div',
          { class: 'gjs-dr-color' },
          h(
            d,
            'select',
            {
              'data-k': `${key}-m`,
              onchange: (e) => {
                const m = (e.target as HTMLSelectElement).value;
                set({ [key]: m === 'auto' ? 'auto' : m === 'default' ? '' : gen === 'dark' ? '#3a5d8f' : '#b3d4fc' }, true);
              },
            },
            h(d, 'option', { value: 'auto', selected: mode === 'auto' }, L.auto),
            h(d, 'option', { value: 'default', selected: mode === 'default' }, L.browserDefault),
            h(d, 'option', { value: 'custom', selected: mode === 'custom' }, '#…'),
          ),
          ...(mode === 'custom' ? colorInput(key, v, (x) => set({ [key]: x })) : []),
        ),
      );
    };

    const list = (key: 'invert' | 'ignoreInlineStyle' | 'ignoreImageAnalysis', label: string, hint?: string) =>
      h(
        d,
        'div',
        { class: 'gjs-dr-sec' },
        h(
          d,
          'div',
          { class: 'gjs-dr-lh' },
          h(d, 'label', { for: `gjs-dr-${key}` }, label),
          h(d, 'button', {
            type: 'button',
            class: 'gjs-dr-link',
            'data-k': `${key}-pick`,
            onclick: () => {
              const sel = this.host.selectedSelector();
              if (!sel) return;
              set({ [key]: [...this.host.settings()[key], sel] }, true);
            },
          }, L.pickSelected),
        ),
        h(d, 'textarea', {
          id: `gjs-dr-${key}`,
          'data-k': key,
          rows: 2,
          spellcheck: 'false',
          placeholder: key === 'invert' ? '.logo\nimg.diagram' : '',
          value: s[key].join('\n'),
          onchange: (e) => set({ [key]: (e.target as HTMLTextAreaElement).value } as unknown as Partial<ThemeSettings>, true),
        }),
        hint ? h(d, 'div', { class: 'gjs-dr-hint', style: 'margin-top:2px' }, hint) : null,
      );

    const prefix = gen === 'dark' ? 'dark' : 'light';
    const copyBtn = h(d, 'button', {
      type: 'button',
      class: 'gjs-dr-btn',
      'data-k': 'copy',
      disabled: !preview,
      onclick: () => {
        void this.host.copyCss().then((ok) => {
          if (!ok) return;
          copyBtn.textContent = L.copied;
          setTimeout(() => (copyBtn.textContent = L.copyCss), 1500);
        });
      },
    }, L.copyCss);

    return [
      this.error ? h(d, 'div', { class: 'gjs-dr-err', role: 'alert' }, this.error) : null,
      h(d, 'div', { class: 'gjs-dr-sec' }, h(d, 'div', { class: 'gjs-dr-row gjs-dr-row--stack' }, h(d, 'span', { class: 'gjs-dr-l' }, L.preview), seg), h(d, 'div', { class: 'gjs-dr-hint' }, L.previewHint)),
      h(
        d,
        'div',
        { class: 'gjs-dr-sec' },
        select('scheme', L.scheme, [
          ['light', L.schemeLight],
          ['dark', L.schemeDark],
        ]),
        select('engine', L.engine, [
          ['auto', L.engineAuto],
          ['dynamic', L.engineDynamic],
          ['filter', L.engineFilter],
        ]),
      ),
      h(d, 'div', { class: 'gjs-dr-sec' }, check('enabled', L.enabled), h(d, 'div', { class: 'gjs-dr-hint' }, L.enabledHint)),
      h(
        d,
        'div',
        { class: 'gjs-dr-sec gjs-dr-site' },
        select('initial', L.initial, [
          ['system', L.initialSystem],
          ['original', L.initialOriginal],
          ['generated', L.initialGenerated],
        ]),
        check('remember', L.remember),
        h(d, 'div', { class: 'gjs-dr-btns' }, h(d, 'button', { type: 'button', class: 'gjs-dr-btn gjs-dr-btn--main', 'data-k': 'add', onclick: () => this.host.addToggle() }, L.addToggle)),
      ),
      h(
        d,
        'div',
        { class: 'gjs-dr-sec' },
        h(d, 'div', { class: 'gjs-dr-h' }, L.colors),
        color(`${prefix}Background` as 'darkBackground', L.background),
        color(`${prefix}Text` as 'darkText', L.text),
        special('selectionColor', L.selection),
        special('scrollbarColor', L.scrollbar),
      ),
      h(
        d,
        'div',
        { class: 'gjs-dr-sec' },
        h(d, 'div', { class: 'gjs-dr-h' }, L.filters),
        range('brightness', L.brightness, 50, 150),
        range('contrast', L.contrast, 50, 150),
        range('sepia', L.sepia, 0, 100),
        range('grayscale', L.grayscale, 0, 100),
      ),
      h(
        d,
        'details',
        { class: 'gjs-dr-sec', open: s.invert.length + s.ignoreInlineStyle.length + s.ignoreImageAnalysis.length > 0 || !!s.css },
        h(d, 'summary', { class: 'gjs-dr-h' }, L.fixes),
        list('invert', L.invert, L.invertHint),
        list('ignoreInlineStyle', L.ignoreInline),
        list('ignoreImageAnalysis', L.ignoreImages),
        h(
          d,
          'div',
          { class: 'gjs-dr-sec' },
          h(d, 'label', { for: 'gjs-dr-css', class: 'gjs-dr-lh' }, L.css),
          h(d, 'textarea', { id: 'gjs-dr-css', 'data-k': 'css', rows: 4, spellcheck: 'false', value: s.css, onchange: (e) => set({ css: (e.target as HTMLTextAreaElement).value }) }),
          h(d, 'div', { class: 'gjs-dr-hint', style: 'margin-top:2px' }, L.cssHint),
        ),
      ),
      h(
        d,
        'div',
        { class: 'gjs-dr-btns' },
        copyBtn,
        h(d, 'button', {
          type: 'button',
          class: 'gjs-dr-btn',
          'data-k': 'reset',
          onclick: () => {
            const w = this.doc.defaultView;
            if (w && typeof w.confirm === 'function' && !w.confirm(L.resetConfirm)) return;
            this.host.reset();
            this.render();
          },
        }, L.reset),
      ),
    ].filter(Boolean) as Node[];
  }

  private preview(on: boolean): void {
    this.host.setPreview(on);
    this.render();
  }
}
