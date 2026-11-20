import grapesjs, { type Editor } from 'grapesjs';
import plugin from '../../src/index';
import type { DarkReaderOptions } from '../../src/options';

/** A real editor with the default panels (views + views-container + options). */
export async function createEditor(opts: DarkReaderOptions = {}, init: Record<string, unknown> = {}): Promise<Editor> {
  const container = document.createElement('div');
  container.id = 'gjs';
  document.body.append(container);
  const editor = grapesjs.init({
    container,
    height: '600px',
    storageManager: false,
    telemetry: false,
    components: '<header id="hd"><h1 id="t">Hello</h1></header><section id="sec"><p>Text</p></section>',
    plugins: [(ed: Editor) => plugin(ed, { stateKey: false, ...opts })],
    ...init,
  } as Parameters<typeof grapesjs.init>[0]);
  await new Promise<void>((resolve) => editor.onReady(() => resolve()));
  return editor;
}

export async function destroyEditor(editor: Editor | undefined): Promise<void> {
  if (!editor) return;
  // Let GrapesJS' own debounced handlers (selector manager, layers) run
  // before the teardown, otherwise they fire on a destroyed editor.
  try {
    editor.select([]);
  } catch {
    /* already gone */
  }
  await new Promise((r) => setTimeout(r, 30));
  // SelectComponent.onSelect is debounced and destroy() itself deselects, so
  // a call can still be queued after the teardown. On a slower machine
  // (Windows) it fires during the next test and crashes on the destroyed
  // model ("Cannot read properties of undefined (reading 'lastComponent')").
  // Cancel it after destroy() and let the rest drain here.
  const em = editor.getModel() as unknown as Record<string, unknown>;
  const selectCmd = (() => {
    try {
      return editor.Commands.get('select-comp') as unknown as { onSelect?: { cancel?: () => void } } | undefined;
    } catch {
      return undefined;
    }
  })();
  try {
    editor.destroy();
  } catch {
    /* jsdom teardown noise */
  }
  selectCmd?.onSelect?.cancel?.();
  // Other debounced views (ClassTagsView.checkSync…) only ask what is
  // selected: the dead model answers "nothing".
  em.getSelected = () => undefined;
  em.getSelectedAll = () => [];
  await new Promise((r) => setTimeout(r, 20));
  document.body.innerHTML = '';
}

export const wait = (ms = 20): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** A fake Dark Reader in the canvas frame (jsdom does not load scripts). */
export function fakeDarkReader(editor: Editor) {
  const win = editor.Canvas.getWindow() as any;
  const calls: Array<[string, ...unknown[]]> = [];
  let on = false;
  win.DarkReader = {
    enable: (t: unknown, f: unknown) => {
      on = true;
      calls.push(['enable', t, f]);
    },
    disable: () => {
      on = false;
      calls.push(['disable']);
    },
    isEnabled: () => on,
    exportGeneratedCSS: async () => 'body{background:#000}',
  };
  return { win, calls, isOn: () => on };
}
