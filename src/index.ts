import type { Editor } from 'grapesjs';
import { assignOptions, definePlugin, registerControl } from './contract';
import { addToggleBlock, addToggleType, BLOCK_ID, TOGGLE_ATTR, TOGGLE_TYPE } from './component';
import { getLabels, registerMessages } from './i18n';
import { META, VERSION, publicOptions, resolveOptions, type DarkReaderLabels, type DarkReaderOptions } from './options';
import { ThemePanel } from './panel';
import { Preview, sanitizeComponent } from './preview';
import { runtimeScriptTag, type RuntimeConfig } from './runtime';
import { DEFAULT_SETTINGS, diffSettings, effectiveEngine, filterCss, generatedScheme, normalizeSettings, toDarkReader, type ThemeSettings } from './settings';
import { ICON, injectStyles } from './styles';

export type { DarkReaderOptions, DarkReaderLabels, TabOptions, ButtonOptions, BlockOptions } from './options';
export type { ThemeSettings, SiteScheme, InitialTheme, ThemeEngine, DarkReaderTheme, DarkReaderFixes } from './settings';
export type { RuntimeConfig } from './runtime';
export { DEFAULT_SETTINGS, normalizeSettings, toDarkReader, generatedScheme, effectiveEngine, filterCss } from './settings';
export { bootRuntime, runtimeScriptTag } from './runtime';
export { sanitizeComponent } from './preview';
export { DEFAULT_SRC, DARKREADER_VERSION } from './options';
export { TOGGLE_TYPE, TOGGLE_ATTR, BLOCK_ID, META, VERSION };

/** Stateful command: running it shows the generated theme in the canvas. */
export const CMD_PREVIEW = 'darkreader:preview';
export const CMD_TOGGLE_PREVIEW = 'darkreader:toggle-preview';
/** Opens the "Theme" tab (view command). */
export const CMD_TAB = 'darkreader:open';
/** Editor events. */
export const EVENT_CHANGE = 'darkreader:change';
export const EVENT_PREVIEW = 'darkreader:preview';
export const EVENT_ERROR = 'darkreader:error';

/** `editor.DarkReader`. */
export interface DarkReaderApi {
  getSettings(): ThemeSettings;
  /** Merges a patch (invalid values are ignored); marks the project changed. */
  setSettings(patch: Partial<ThemeSettings>): ThemeSettings;
  resetSettings(): ThemeSettings;
  /** Generated theme in the canvas. */
  setPreview(on: boolean): Promise<void>;
  togglePreview(): Promise<void>;
  isPreview(): boolean;
  /** What the published pages get (`window.gjsTheme` runtime). */
  getRuntimeConfig(): RuntimeConfig;
  /** `<script>` to put in the `<head>` of a page (best: no flash of the original colours). */
  getRuntimeScript(): string;
  /** CSS Dark Reader generated for the canvas page (preview must be on). */
  exportCss(): Promise<string>;
  /** Adds a toggle into the selected component (or the page). */
  addToggle(target?: any): any;
}

declare module 'grapesjs' {
  interface Editor {
    DarkReader?: DarkReaderApi;
  }
}

function grapesjsDarkReader(editor: Editor, options: DarkReaderOptions = {}): void {
  const opts = resolveOptions(options);
  registerMessages(editor);
  const labels = (): DarkReaderLabels => getLabels(editor, opts.labels);
  const base = (): ThemeSettings => normalizeSettings(opts.defaults, DEFAULT_SETTINGS);
  let settings: ThemeSettings = base();
  let panel: ThemePanel | null = null;
  const offs: Array<() => void> = [];
  const on = (ev: string, fn: (...a: any[]) => void) => {
    editor.on(ev, fn);
    offs.push(() => editor.off(ev, fn));
  };

  const offControl = registerControl(editor, META, () => publicOptions(opts), (patch) => {
    assignOptions(opts as unknown as Record<string, unknown>, patch);
    panel?.render();
    if ('src' in patch) void preview.refresh();
  });

  /* ------------------------------------------------------------ state */

  const readState = (): boolean => {
    if (!opts.stateKey) return opts.preview;
    try {
      const s = JSON.parse(localStorage.getItem(opts.stateKey) || 'null');
      return typeof s?.preview === 'boolean' ? s.preview : opts.preview;
    } catch {
      return opts.preview;
    }
  };
  const writeState = (v: boolean) => {
    if (!opts.stateKey) return;
    try {
      localStorage.setItem(opts.stateKey, JSON.stringify({ preview: v }));
    } catch {
      /* storage disabled */
    }
  };

  /* ---------------------------------------------------------- preview */

  const report = (e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e);
    editor.trigger(EVENT_ERROR, { error: e });
    panel?.setError(labels().engineError + msg);
    console.warn('[grapesjs-darkreader]', e);
  };
  const preview = new Preview({
    editor,
    settings: () => settings,
    src: () => opts.src,
    onToggle: (v) => void setPreview(v),
    onError: report,
  });
  let previewWanted = readState();

  const setPreview = async (v: boolean): Promise<void> => {
    previewWanted = !!v;
    writeState(previewWanted);
    syncButton(previewWanted);
    panel?.setError('');
    editor.trigger(EVENT_PREVIEW, { on: previewWanted });
    if (canvasReady) await preview.setOn(previewWanted);
  };

  let refreshTimer: ReturnType<typeof setTimeout> | undefined;
  const scheduleRefresh = () => {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      if (preview.isOn()) void preview.refresh();
    }, 120);
  };

  /* --------------------------------------------------------- settings */

  const changed = (opt: { silent?: boolean } = {}) => {
    scheduleRefresh();
    editor.trigger(EVENT_CHANGE, { settings: { ...settings } });
    if (opt.silent) return;
    const em: any = (editor as any).getModel?.();
    if (typeof em?.changesUp === 'function') em.changesUp({});
    else editor.trigger('update');
  };
  const setSettings = (patch: Partial<ThemeSettings>): ThemeSettings => {
    const next = normalizeSettings(patch, settings);
    if (JSON.stringify(next) === JSON.stringify(settings)) return settings;
    settings = next;
    changed();
    return settings;
  };
  const resetSettings = (): ThemeSettings => {
    settings = base();
    changed();
    return settings;
  };

  // Project data (getProjectData / loadProjectData / Storage Manager).
  const em: any = (editor as any).getModel?.();
  const storables: any[] | undefined = em?.storables || em?.get?.('storables');
  const storable = {
    name: 'DarkReaderPlugin',
    storageKey: opts.storageKey,
    store: () => ({ [opts.storageKey]: diffSettings(settings, base()) }),
    load: (data: Record<string, unknown>) => {
      settings = normalizeSettings(data?.[opts.storageKey], base());
      panel?.render();
      changed({ silent: true });
    },
    clear: () => {
      settings = base();
      panel?.render();
    },
  };
  if (Array.isArray(storables)) storables.push(storable);
  else console.warn('[grapesjs-darkreader] Editor storables not found: theme settings will not be saved with the project.');

  // grapesjs-site-pages: one set of settings per site, not copied into every page.
  if (opts.sharedWithPages) {
    let done = false;
    const share = () => {
      const p: any = (editor as any).PagesManager;
      if (done || !p?.shared || typeof p.shared.register !== 'function') return;
      done = true;
      Promise.resolve(p.shared.register(opts.storageKey)).catch((e: unknown) => console.warn('[grapesjs-darkreader]', e));
    };
    share();
    editor.onReady(share);
  }

  /* ---------------------------------------------------------- runtime */

  const runtimeConfig = (): RuntimeConfig => {
    const { theme, fixes } = toDarkReader(settings);
    const gen = generatedScheme(settings);
    return {
      on: settings.enabled,
      src: opts.src,
      scheme: settings.scheme,
      generated: gen,
      initial: settings.initial,
      remember: settings.remember,
      key: opts.choiceKey,
      antiFlash: opts.antiFlash,
      flashBackground: gen === 'dark' ? settings.darkBackground : settings.lightBackground,
      engine: effectiveEngine(settings),
      filterCss: effectiveEngine(settings) === 'filter' ? filterCss(settings) : '',
      theme,
      fixes,
    };
  };

  // Pages without a toggle get the runtime from editor.getHtml().
  const originalGetHtml = editor.getHtml.bind(editor);
  (editor as any).getHtml = (o?: any) => {
    const html = originalGetHtml(o);
    if (o?.component || typeof html !== 'string' || !opts.exportRuntime || !settings.enabled) return html;
    const jsInHtml = o?.jsInHtml ?? (editor.getConfig() as any).jsInHtml ?? true;
    let toggles = 0;
    try {
      toggles = editor.getWrapper()?.find(`[${TOGGLE_ATTR}]`).length || 0;
    } catch {
      /* no wrapper */
    }
    // The toggles' export script already starts the runtime.
    if (toggles && jsInHtml) return html;
    return html + runtimeScriptTag(runtimeConfig());
  };

  /* -------------------------------------------------------- component */

  addToggleType(editor, runtimeConfig, () => labels().toggleTitle);
  if (opts.block) addToggleBlock(editor, opts.block.category, opts.block.label || labels().blockLabel);

  const addToggle = (target?: any): any => {
    const sel = target || editor.getSelected();
    const dest = sel && sel.get('droppable') !== false && !sel.is?.(TOGGLE_TYPE) ? sel : editor.getWrapper();
    const added = dest?.append({ type: TOGGLE_TYPE })?.[0];
    if (added) editor.select(added);
    return added;
  };

  /* ---------------------------------------------------- model hygiene */

  // Text edited in the RTE: whatever Dark Reader wrote into the DOM must not stay in the model.
  on('rte:disable', (view: any) => {
    const cmp = view?.model;
    if (!cmp) return;
    setTimeout(() => sanitizeComponent(cmp), 0);
    setTimeout(() => sanitizeComponent(cmp), 200);
  });
  on('component:add', (cmp: any) => {
    if (preview.isOn()) sanitizeComponent(cmp);
  });

  /* ------------------------------------------------------------- UI */

  const tabCmd = {
    run() {
      const el = mountPanel();
      if (el) el.style.display = '';
    },
    stop() {
      if (panel) panel.root.style.display = 'none';
    },
  };
  editor.Commands.add(CMD_TAB, tabCmd);
  editor.Commands.add(CMD_PREVIEW, {
    run: () => void setPreview(true),
    stop: () => void setPreview(false),
  });
  editor.Commands.add(CMD_TOGGLE_PREVIEW, { run: () => void setPreview(!previewWanted) });

  const panelHost = {
    settings: () => settings,
    update: (patch: Partial<ThemeSettings>) => void setSettings(patch),
    reset: () => void resetSettings(),
    isPreview: () => previewWanted,
    setPreview: (v: boolean) => void setPreview(v),
    addToggle: () => void addToggle(),
    copyCss: async () => {
      try {
        const css = await preview.exportCss();
        if (!css) return false;
        await navigator.clipboard.writeText(css);
        return true;
      } catch (e) {
        report(e);
        return false;
      }
    },
    selectedSelector: () => {
      const s: any = editor.getSelected();
      if (!s || s === editor.getWrapper()) return null;
      const cls = (s.getClasses?.() || []).filter((c: string) => !/^gjs-/.test(c));
      if (cls.length) return `.${cls.join('.')}`;
      return `#${s.getId()}`;
    },
    labels,
  };

  const viewsContainer = (): HTMLElement | null => {
    const p: any = editor.Panels.getPanel('views-container');
    const el = p?.view?.el as HTMLElement | undefined;
    if (el) return el;
    const root = editor.getContainer() as HTMLElement | null;
    return root?.querySelector<HTMLElement>('.gjs-pn-views-container') || null;
  };

  function mountPanel(): HTMLElement | null {
    const host = viewsContainer();
    if (!host) return null;
    if (!panel) panel = new ThemePanel(host.ownerDocument, panelHost);
    if (panel.root.parentNode !== host && !panel.root.parentNode) host.appendChild(panel.root);
    panel.render();
    return panel.root;
  }

  const SWITCH_CMD_RE = /^(open|show)-(sm|styles?|layers?|blocks?|tm|traits?)$/i;
  const tabPanel = (): any => {
    if (!opts.tab) return null;
    const Panels: any = editor.Panels;
    if (opts.tab.panel) return Panels.getPanel(opts.tab.panel) || null;
    const all: any[] = Panels.getPanels?.().models || [];
    return (
      all.find((p) =>
        (p.get('buttons')?.models || []).some((b: any) => {
          const c = b.get('command');
          return SWITCH_CMD_RE.test(typeof c === 'string' ? c : '') || SWITCH_CMD_RE.test(b.id || '');
        }),
      ) ||
      Panels.getPanel('views') ||
      null
    );
  };

  const addTab = () => {
    if (!opts.tab) return;
    const p = tabPanel();
    if (!p || p.get('buttons').get(opts.tab.id)) return;
    p.get('buttons').add({
      id: opts.tab.id,
      label: ICON,
      command: CMD_TAB,
      togglable: true,
      attributes: { title: labels().tab, 'data-tooltip-pos': 'bottom' },
    });
  };

  let syncing = false;
  const getButton = (): any => {
    if (!opts.button) return null;
    try {
      return editor.Panels.getButton(opts.button.panel, opts.button.id) || null;
    } catch {
      return null;
    }
  };
  function syncButton(v: boolean) {
    const b = getButton();
    if (!b || !!b.get('active') === v || syncing) return;
    syncing = true;
    try {
      b.set('active', v, { fromListen: true });
    } finally {
      syncing = false;
    }
  }
  const addButton = () => {
    if (!opts.button) return;
    const { panel: pid, id } = opts.button;
    if (!editor.Panels.getPanel(pid) || editor.Panels.getButton(pid, id)) return;
    editor.Panels.addButton(pid, {
      id,
      label: ICON,
      command: CMD_PREVIEW,
      togglable: true,
      context: 'gjs-darkreader',
      active: false,
      attributes: { title: `${labels().tab}: ${labels().previewGenerated}`, 'data-tooltip-pos': 'bottom' },
    } as any);
  };

  // i18n:locale fires before the locale is switched.
  on('i18n:locale i18n:update', () =>
    setTimeout(() => {
      panel?.render();
      const b = getButton();
      if (b) b.set('attributes', { ...(b.get('attributes') || {}), title: `${labels().tab}: ${labels().previewGenerated}` });
      const t: any = opts.tab ? tabPanel()?.get('buttons').get(opts.tab.id) : null;
      if (t) t.set('attributes', { ...(t.get('attributes') || {}), title: labels().tab });
    }, 0),
  );

  /* ----------------------------------------------------------- start */

  let canvasReady = false;
  on('canvas:frame:load', (ev: any) => {
    const frame = (ev?.el || ev?.frame?.view?.el) as HTMLIFrameElement | undefined;
    if (frame?.tagName === 'IFRAME') void preview.apply(frame);
    else if (canvasReady) void preview.refresh();
  });

  editor.onReady(() => {
    injectStyles(document);
    addTab();
    addButton();
    canvasReady = true;
    if (previewWanted) {
      const b = getButton();
      if (b && !b.get('active')) b.set('active', true);
      void preview.setOn(true);
    } else {
      syncButton(false);
      void preview.setOn(false);
    }
  });

  editor.on('destroy', () => {
    clearTimeout(refreshTimer);
    offControl();
    offs.splice(0).forEach((f) => f());
    preview.destroy();
    panel?.root.remove();
    if (Array.isArray(storables)) {
      const i = storables.indexOf(storable);
      if (i >= 0) storables.splice(i, 1);
    }
  });

  const api: DarkReaderApi = {
    getSettings: () => ({ ...settings }),
    setSettings: (p) => {
      const s = setSettings(p);
      panel?.render();
      return { ...s };
    },
    resetSettings: () => {
      const s = resetSettings();
      panel?.render();
      return { ...s };
    },
    setPreview,
    togglePreview: () => setPreview(!previewWanted),
    isPreview: () => previewWanted,
    getRuntimeConfig: runtimeConfig,
    getRuntimeScript: () => runtimeScriptTag(runtimeConfig()),
    exportCss: () => preview.exportCss(),
    addToggle,
  };
  (editor as any).DarkReader = api;
}




definePlugin(grapesjsDarkReader, META);

export { grapesjsDarkReader };
export default grapesjsDarkReader;
