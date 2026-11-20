import type { PluginMeta } from './contract';
import type { ThemeSettings } from './settings';

export interface DarkReaderLabels {
  tab: string;
  preview: string;
  previewOriginal: string;
  previewGenerated: string;
  previewHint: string;
  enabled: string;
  enabledHint: string;
  scheme: string;
  schemeLight: string;
  schemeDark: string;
  engine: string;
  engineAuto: string;
  engineDynamic: string;
  engineFilter: string;
  initial: string;
  initialSystem: string;
  initialOriginal: string;
  initialGenerated: string;
  remember: string;
  filters: string;
  brightness: string;
  contrast: string;
  sepia: string;
  grayscale: string;
  colors: string;
  background: string;
  text: string;
  selection: string;
  scrollbar: string;
  auto: string;
  browserDefault: string;
  fixes: string;
  invert: string;
  invertHint: string;
  ignoreInline: string;
  ignoreImages: string;
  css: string;
  cssHint: string;
  addToggle: string;
  copyCss: string;
  copied: string;
  reset: string;
  resetConfirm: string;
  engineError: string;
  blockLabel: string;
  toggleTitle: string;
  pickSelected: string;
}

export interface TabOptions {
  /** Panel of the view buttons; `null` — found by its buttons (`open-sm`, `open-layers`…). Default `null`. */
  panel?: string | null;
  /** Button id. Default `'gjs-darkreader'`. */
  id?: string;
}

export interface ButtonOptions {
  /** Default `'options'`. */
  panel?: string;
  /** Default `'gjs-darkreader-preview'`. */
  id?: string;
}

export interface BlockOptions {
  /** Default `'Extra'`. */
  category?: string;
  /** Default from the labels. */
  label?: string;
}

export interface DarkReaderOptions {
  /**
   * darkreader.js (the UMD build of the `darkreader` npm package, MIT) —
   * loaded into the canvas and by the published pages. Default jsDelivr,
   * pinned version.
   */
  src?: string;
  /** Settings of a new project (the project's own settings win). */
  defaults?: Partial<ThemeSettings>;
  /** Project data key. Default `'darkreader'`. */
  storageKey?: string;
  /** With grapesjs-site-pages: settings once per site, not copied into every page. Default true. */
  sharedWithPages?: boolean;
  /** The "Theme" tab (a view button: grapesjs-sidebar-tools docks it as a tab). `false` — none. */
  tab?: TabOptions | false;
  /** Preview on/off button in a toolbar panel. `false` — none. */
  button?: ButtonOptions | false;
  /** The "Theme toggle" block. `false` — none (the component type is still there). */
  block?: BlockOptions | false;
  /** Add the runtime `<script>` to `editor.getHtml()` (pages without a toggle get the theme too). Default true. */
  exportRuntime?: boolean;
  /** Published pages: hide the page until the generated theme is applied on load. Default true. */
  antiFlash?: boolean;
  /** localStorage key of the visitor's choice on the site. Default `'gjs-theme'`. */
  choiceKey?: string;
  /** localStorage key of the editor state (preview on/off); `false` — keep nothing. Default `'gjs-darkreader'`. */
  stateKey?: string | false;
  /** Preview shown on first start (later the last state is restored). Default false. */
  preview?: boolean;
  /** Label overrides (otherwise from editor.I18n: en/ru/uk). */
  labels?: Partial<DarkReaderLabels>;
}

export interface ResolvedOptions {
  src: string;
  defaults: Partial<ThemeSettings>;
  storageKey: string;
  sharedWithPages: boolean;
  tab: { panel: string | null; id: string } | false;
  button: Required<ButtonOptions> | false;
  block: { category: string; label: string | null } | false;
  exportRuntime: boolean;
  antiFlash: boolean;
  choiceKey: string;
  stateKey: string | false;
  preview: boolean;
  labels: Partial<DarkReaderLabels>;
}

export const DARKREADER_VERSION = '4.9.135';
export const DEFAULT_SRC = `https://cdn.jsdelivr.net/npm/darkreader@${DARKREADER_VERSION}/darkreader.min.js`;

const str = (v: unknown, def: string): string => (typeof v === 'string' && v.trim() ? v.trim() : def);

export function resolveOptions(o: DarkReaderOptions = {}): ResolvedOptions {
  return {
    src: str(o.src, DEFAULT_SRC),
    defaults: { ...(o.defaults || {}) },
    storageKey: str(o.storageKey, 'darkreader'),
    sharedWithPages: o.sharedWithPages !== false,
    tab: o.tab === false ? false : { panel: (o.tab && o.tab.panel) || null, id: str(o.tab && o.tab.id, 'gjs-darkreader') },
    button: o.button === false ? false : { panel: str(o.button && o.button.panel, 'options'), id: str(o.button && o.button.id, 'gjs-darkreader-preview') },
    block: o.block === false ? false : { category: str(o.block && o.block.category, 'Extra'), label: (o.block && o.block.label) || null },
    exportRuntime: o.exportRuntime !== false,
    antiFlash: o.antiFlash !== false,
    choiceKey: str(o.choiceKey, 'gjs-theme'),
    stateKey: o.stateKey === false ? false : str(o.stateKey, 'gjs-darkreader'),
    preview: o.preview === true,
    labels: { ...(o.labels || {}) },
  };
}

export const PLUGIN_ID = 'grapesjs-darkreader';
/** Version of this package (a test checks it against package.json). */
export const VERSION = '0.1.0';

export const META: PluginMeta = {
  id: PLUGIN_ID,
  version: VERSION,
  title: 'Dark Reader theme',
  description: 'Generated dark / light theme of the site (Dark Reader engine), a theme toggle component and a "Theme" tab.',
  options: [
    { key: 'exportRuntime', type: 'boolean', default: true, title: 'Runtime script in the exported HTML', description: 'Pages without a toggle get the theme too.', live: true },
    { key: 'antiFlash', type: 'boolean', default: true, title: 'No flash of the original colours on load', live: true },
    { key: 'choiceKey', type: 'string', default: 'gjs-theme', title: "localStorage key of the visitor's choice", live: true, advanced: true },
    { key: 'src', type: 'string', default: DEFAULT_SRC, title: 'darkreader.js URL', description: 'UMD build of the darkreader npm package.', live: true, advanced: true },
    { key: 'preview', type: 'boolean', default: false, title: 'Preview on first start' },
    { key: 'defaults', type: 'json', default: {}, title: 'Settings of a new project', advanced: true },
    { key: 'tab', type: 'json', default: { panel: null, id: 'gjs-darkreader' }, title: '"Theme" tab', description: '{ "panel": null, "id": "gjs-darkreader" }, or false.', advanced: true },
    { key: 'button', type: 'json', default: { panel: 'options', id: 'gjs-darkreader-preview' }, title: 'Preview button', description: 'or false.', advanced: true },
    { key: 'block', type: 'json', default: { category: 'Extra' }, title: 'Toggle block', description: '{ "category": "Extra", "label": "…" }, or false.', advanced: true },
    { key: 'storageKey', type: 'string', default: 'darkreader', title: 'Project data key', advanced: true },
    { key: 'sharedWithPages', type: 'boolean', default: true, title: 'One set of settings per site (grapesjs-site-pages)', advanced: true },
    { key: 'stateKey', type: 'string', default: 'gjs-darkreader', title: 'localStorage key of the editor state', description: 'Empty — keep nothing.', advanced: true },
    { key: 'labels', type: 'json', default: {}, title: 'Texts', live: true, advanced: true },
  ],
};

export function publicOptions(o: ResolvedOptions): Record<string, unknown> {
  return {
    exportRuntime: o.exportRuntime,
    antiFlash: o.antiFlash,
    choiceKey: o.choiceKey,
    src: o.src,
    preview: o.preview,
    defaults: { ...o.defaults },
    tab: o.tab ? { ...o.tab } : false,
    button: o.button ? { ...o.button } : false,
    block: o.block ? { ...o.block } : false,
    storageKey: o.storageKey,
    sharedWithPages: o.sharedWithPages,
    stateKey: o.stateKey || '',
    labels: { ...o.labels },
  };
}
