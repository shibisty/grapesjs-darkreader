/**
 * Theme settings of a site: stored in the project data (key `darkreader`),
 * edited in the "Theme" tab, used by the canvas preview and by the runtime
 * of the published pages.
 */

/** The design as made in the editor. The other scheme is generated. */
export type SiteScheme = 'light' | 'dark';
/** What a visitor sees first (before choosing with a toggle). */
export type InitialTheme = 'system' | 'original' | 'generated';
/**
 * How the theme is generated:
 *  - `'dynamic'` — Dark Reader's dynamic theme (analyses and recolours every style; dark from light);
 *  - `'filter'` — CSS filter inversion of the whole page with media re-inverted (no script needed;
 *    the only way to get a light theme from a dark design);
 *  - `'auto'` — dynamic for a light design, filter for a dark one.
 */
export type ThemeEngine = 'auto' | 'dynamic' | 'filter';

export interface ThemeSettings {
  /** Apply the generated theme on the published site (runtime + toggles). */
  enabled: boolean;
  /** The design made in the editor: `'light'` → a dark theme is generated, `'dark'` → a light one. */
  scheme: SiteScheme;
  /** Generation engine. */
  engine: ThemeEngine;
  /** First theme for a visitor: follow the OS (`prefers-color-scheme`), the original design, or the generated one. */
  initial: InitialTheme;
  /** Remember the visitor's choice (localStorage of the site). */
  remember: boolean;
  /** Dark Reader filters, %. */
  brightness: number;
  contrast: number;
  sepia: number;
  grayscale: number;
  /** Colours of the generated dark theme. */
  darkBackground: string;
  darkText: string;
  /** Colours of the generated light theme. */
  lightBackground: string;
  lightText: string;
  /** `'auto'`, `''` (browser default) or a colour. */
  selectionColor: string;
  /** `'auto'`, `''` (browser default) or a colour. */
  scrollbarColor: string;
  /** CSS selectors to invert as they are (logos, maps, pictures of text). */
  invert: string[];
  /** Selectors whose inline `style` is left as is. */
  ignoreInlineStyle: string[];
  /** Selectors of images that are not analysed / changed. */
  ignoreImageAnalysis: string[];
  /** Extra CSS for the generated theme only. */
  css: string;
}

export const DEFAULT_SETTINGS: ThemeSettings = {
  enabled: true,
  scheme: 'light',
  engine: 'auto',
  initial: 'system',
  remember: true,
  brightness: 100,
  contrast: 100,
  sepia: 0,
  grayscale: 0,
  // Dark Reader's defaults.
  darkBackground: '#181a1b',
  darkText: '#e8e6e3',
  lightBackground: '#dcdad7',
  lightText: '#181a1b',
  selectionColor: 'auto',
  scrollbarColor: '',
  invert: [],
  ignoreInlineStyle: [],
  ignoreImageAnalysis: [],
  css: '',
};

const COLOR_RE = /^(#[0-9a-f]{3,8}|(rgb|hsl)a?\([^)]{3,40}\)|[a-z]{3,20})$/i;

const num = (v: unknown, def: number, min: number, max: number): number => {
  const n = Number(v);
  return isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : def;
};
const color = (v: unknown, def: string): string => (typeof v === 'string' && COLOR_RE.test(v.trim()) ? v.trim() : def);
const special = (v: unknown, def: string): string =>
  v === '' || v === 'auto' ? (v as string) : typeof v === 'string' && COLOR_RE.test(v.trim()) ? v.trim() : def;

/** Selector lists: arrays or text (one per line / comma-separated outside brackets). */
export function selectorList(v: unknown): string[] {
  const items = Array.isArray(v) ? v.map(String) : typeof v === 'string' ? v.split(/\n/) : [];
  return items
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s, i, a) => a.indexOf(s) === i)
    .slice(0, 200);
}

/** Any input (stored data, form patch) → complete, valid settings. */
export function normalizeSettings(input: unknown, base: ThemeSettings = DEFAULT_SETTINGS): ThemeSettings {
  const o = (input && typeof input === 'object' ? input : {}) as Partial<Record<keyof ThemeSettings, unknown>>;
  const has = (k: keyof ThemeSettings) => o[k] !== undefined;
  return {
    enabled: has('enabled') ? !!o.enabled : base.enabled,
    scheme: o.scheme === 'dark' || o.scheme === 'light' ? o.scheme : base.scheme,
    engine: o.engine === 'dynamic' || o.engine === 'filter' || o.engine === 'auto' ? o.engine : base.engine,
    initial: o.initial === 'original' || o.initial === 'generated' || o.initial === 'system' ? o.initial : base.initial,
    remember: has('remember') ? !!o.remember : base.remember,
    brightness: has('brightness') ? num(o.brightness, base.brightness, 50, 150) : base.brightness,
    contrast: has('contrast') ? num(o.contrast, base.contrast, 50, 150) : base.contrast,
    sepia: has('sepia') ? num(o.sepia, base.sepia, 0, 100) : base.sepia,
    grayscale: has('grayscale') ? num(o.grayscale, base.grayscale, 0, 100) : base.grayscale,
    darkBackground: has('darkBackground') ? color(o.darkBackground, base.darkBackground) : base.darkBackground,
    darkText: has('darkText') ? color(o.darkText, base.darkText) : base.darkText,
    lightBackground: has('lightBackground') ? color(o.lightBackground, base.lightBackground) : base.lightBackground,
    lightText: has('lightText') ? color(o.lightText, base.lightText) : base.lightText,
    selectionColor: has('selectionColor') ? special(o.selectionColor, base.selectionColor) : base.selectionColor,
    scrollbarColor: has('scrollbarColor') ? special(o.scrollbarColor, base.scrollbarColor) : base.scrollbarColor,
    invert: has('invert') ? selectorList(o.invert) : base.invert.slice(),
    ignoreInlineStyle: has('ignoreInlineStyle') ? selectorList(o.ignoreInlineStyle) : base.ignoreInlineStyle.slice(),
    ignoreImageAnalysis: has('ignoreImageAnalysis') ? selectorList(o.ignoreImageAnalysis) : base.ignoreImageAnalysis.slice(),
    css: has('css') ? String(o.css ?? '').slice(0, 50000) : base.css,
  };
}

/** Only what differs from the defaults (what goes into the project data). */
export function diffSettings(s: ThemeSettings, base: ThemeSettings = DEFAULT_SETTINGS): Partial<ThemeSettings> {
  const out: Record<string, unknown> = {};
  (Object.keys(base) as (keyof ThemeSettings)[]).forEach((k) => {
    if (JSON.stringify(s[k]) !== JSON.stringify(base[k])) out[k] = s[k];
  });
  return out as Partial<ThemeSettings>;
}

/** Dark Reader `Theme` (only the fields this plugin sets). */
export interface DarkReaderTheme {
  mode: 0 | 1;
  brightness: number;
  contrast: number;
  sepia: number;
  grayscale: number;
  darkSchemeBackgroundColor: string;
  darkSchemeTextColor: string;
  lightSchemeBackgroundColor: string;
  lightSchemeTextColor: string;
  selectionColor: string;
  scrollbarColor: string;
}

/** Dark Reader `DynamicThemeFix`. */
export interface DarkReaderFixes {
  url: string[];
  invert: string[];
  css: string;
  ignoreInlineStyle: string[];
  ignoreImageAnalysis: string[];
  disableStyleSheetsProxy: boolean;
}

/** The engine actually used. */
export const effectiveEngine = (s: ThemeSettings): 'dynamic' | 'filter' =>
  s.engine === 'auto' ? (s.scheme === 'dark' ? 'filter' : 'dynamic') : s.engine;

/** What Dark Reader's filter mode re-inverts (media keeps its colours). */
export const FILTER_REINVERT = [
  'img',
  'video',
  ':not(object):not(body)>embed',
  'object',
  'svg image',
  '[style*="background:url"]',
  '[style*="background-image:url"]',
  '[style*="background: url"]',
  '[style*="background-image: url"]',
  '[background]',
];
const FILTER_NOINVERT = [
  '[style*="background:url"] *',
  '[style*="background-image:url"] *',
  '[style*="background: url"] *',
  '[style*="background-image: url"] *',
  'input',
  '[background] *',
];

/** `#rrggbb` → the colour that `invert(100%) hue-rotate(180deg)` turns (about) into it. */
export function preInvert(color: string): string {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return color;
  const hex = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  const inv = [0, 2, 4].map((i) => (255 - parseInt(hex.slice(i, i + 2), 16)).toString(16).padStart(2, '0'));
  return `#${inv.join('')}`;
}

/**
 * The filter engine's stylesheet (after Dark Reader's css-filter generator):
 * the page is inverted, media and the `invert` selectors are inverted back.
 */
export function filterCss(s: ThemeSettings): string {
  const filters = ['invert(100%) hue-rotate(180deg)'];
  if (s.brightness !== 100) filters.push(`brightness(${s.brightness}%)`);
  if (s.contrast !== 100) filters.push(`contrast(${s.contrast}%)`);
  if (s.grayscale) filters.push(`grayscale(${s.grayscale}%)`);
  if (s.sepia) filters.push(`sepia(${s.sepia}%)`);
  const f = filters.join(' ');
  const rev = 'invert(100%) hue-rotate(180deg)';
  const bg = generatedScheme(s) === 'dark' ? s.darkBackground : s.lightBackground;
  return [
    '@media screen {',
    `html{-webkit-filter:${f} !important;filter:${f} !important;background:${preInvert(bg)} !important}`,
    `${[...FILTER_REINVERT, ...s.invert].join(',\n')}{-webkit-filter:${rev} !important;filter:${rev} !important}`,
    `${FILTER_NOINVERT.join(',\n')}{-webkit-filter:none !important;filter:none !important}`,
    ':-webkit-full-screen,:-webkit-full-screen *,:fullscreen,:fullscreen *{-webkit-filter:none !important;filter:none !important}',
    s.css,
    '}',
  ]
    .filter(Boolean)
    .join('\n');
}

/** The generated scheme: the opposite of the original design. */
export const generatedScheme = (s: ThemeSettings): SiteScheme => (s.scheme === 'light' ? 'dark' : 'light');

/**
 * Settings → arguments of `DarkReader.enable(theme, fixes)`.
 * `extraIgnoreInline` / `extraCss` are added by the editor preview.
 */
export function toDarkReader(
  s: ThemeSettings,
  extra: { ignoreInlineStyle?: string[]; css?: string } = {},
): { theme: DarkReaderTheme; fixes: DarkReaderFixes } {
  return {
    theme: {
      // 1 — dark mode, 0 — "dimmed" (light) mode.
      mode: generatedScheme(s) === 'dark' ? 1 : 0,
      brightness: s.brightness,
      contrast: s.contrast,
      sepia: s.sepia,
      grayscale: s.grayscale,
      darkSchemeBackgroundColor: s.darkBackground,
      darkSchemeTextColor: s.darkText,
      lightSchemeBackgroundColor: s.lightBackground,
      lightSchemeTextColor: s.lightText,
      selectionColor: s.selectionColor,
      scrollbarColor: s.scrollbarColor,
    },
    fixes: {
      url: ['*'],
      invert: s.invert.slice(),
      css: [s.css, extra.css].filter(Boolean).join('\n'),
      ignoreInlineStyle: [...s.ignoreInlineStyle, ...(extra.ignoreInlineStyle || [])],
      ignoreImageAnalysis: s.ignoreImageAnalysis.slice(),
      disableStyleSheetsProxy: false,
    },
  };
}
