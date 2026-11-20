import { afterEach, describe, expect, it } from 'vitest';
import type { Editor } from 'grapesjs';
import { CMD_TAB, EVENT_CHANGE, TOGGLE_TYPE } from '../src/index';
import { patchRealm, sanitizeComponent } from '../src/preview';
import { createEditor, destroyEditor, fakeDarkReader, wait } from './helpers/editor';

let editor: Editor | undefined;
afterEach(async () => {
  await destroyEditor(editor);
  editor = undefined;
});

const frameDoc = () => editor!.Canvas.getDocument();

describe('setup', () => {
  it('API, tab button in the views panel, preview button, block', async () => {
    editor = await createEditor();
    expect(editor.DarkReader).toBeTruthy();
    expect(editor.Panels.getButton('views', 'gjs-darkreader')).toBeTruthy();
    const b = editor.Panels.getButton('options', 'gjs-darkreader-preview')!;
    expect(b.get('context')).toBe('gjs-darkreader');
    expect(editor.BlockManager.get('theme-toggle')).toBeTruthy();
  });

  it('tab: false / button: false / block: false', async () => {
    editor = await createEditor({ tab: false, button: false, block: false });
    expect(editor.Panels.getButton('views', 'gjs-darkreader')).toBeFalsy();
    expect(editor.Panels.getButton('options', 'gjs-darkreader-preview')).toBeFalsy();
    expect(editor.BlockManager.get('theme-toggle')).toBeFalsy();
  });

  it('the tab renders the settings into the views container', async () => {
    editor = await createEditor();
    editor.runCommand(CMD_TAB);
    const root = document.querySelector<HTMLElement>('.gjs-pn-views-container [data-gjs-darkreader-panel]')!;
    expect(root).toBeTruthy();
    expect(root.querySelector('#gjs-dr-scheme')).toBeTruthy();
    expect(root.querySelector('#gjs-dr-brightness')).toBeTruthy();
    // a change in the form goes to the settings
    const sel = root.querySelector<HTMLSelectElement>('#gjs-dr-scheme')!;
    sel.value = 'dark';
    sel.dispatchEvent(new Event('change'));
    expect(editor.DarkReader!.getSettings().scheme).toBe('dark');
    // the colour fields follow the generated scheme (light now)
    expect((root.querySelector('[data-k="lightBackground-t"]') as HTMLInputElement).value).toBe('#dcdad7');
    editor.stopCommand(CMD_TAB);
    expect(root.style.display).toBe('none');
  });

  it('labels follow the editor locale', async () => {
    editor = await createEditor({}, { i18n: { locale: 'ru', detectLocale: false } });
    editor.runCommand(CMD_TAB);
    expect(document.querySelector('[data-gjs-darkreader-panel]')!.textContent).toContain('Дизайн сайта');
    expect(editor.Panels.getButton('views', 'gjs-darkreader')!.get('attributes').title).toBe('Тема');
  });
});

describe('settings in the project', () => {
  it('stored as a diff, loaded back, change event', async () => {
    editor = await createEditor();
    const events: unknown[] = [];
    editor.on(EVENT_CHANGE, (e: unknown) => events.push(e));
    editor.DarkReader!.setSettings({ sepia: 12, invert: ['.logo'] });
    expect(events.length).toBe(1);
    const data = editor.getProjectData() as any;
    expect(data.darkreader).toEqual({ sepia: 12, invert: ['.logo'] });
    editor.DarkReader!.resetSettings();
    expect(editor.DarkReader!.getSettings().sepia).toBe(0);
    editor.loadProjectData(data);
    expect(editor.DarkReader!.getSettings()).toMatchObject({ sepia: 12, invert: ['.logo'] });
  });

  it('defaults option is the base of a new project', async () => {
    editor = await createEditor({ defaults: { scheme: 'dark', initial: 'original' } });
    expect(editor.DarkReader!.getSettings()).toMatchObject({ scheme: 'dark', initial: 'original' });
    expect((editor.getProjectData() as any).darkreader).toEqual({});
  });
});

describe('export', () => {
  it('runtime script in getHtml when there is no toggle; not with toggles; not when off', async () => {
    editor = await createEditor();
    expect(editor.getHtml()).toContain('<script data-gjs-theme-runtime>');
    expect(editor.getHtml({ component: editor.getWrapper()!.find('#hd')[0] } as any)).not.toContain('data-gjs-theme-runtime');
    editor.DarkReader!.addToggle(editor.getWrapper()!.find('#hd')[0]);
    const html = editor.getHtml();
    expect(html).not.toContain('data-gjs-theme-runtime');
    expect(html).toContain('data-gjs-theme-toggle');
    // the toggle's export script with the settings as props
    expect(html).toContain('"generated":"dark"');
    expect(html).toContain('gjsTheme');
    expect(editor.getCss()).toContain('.gjs-theme-toggle');
    editor.DarkReader!.setSettings({ enabled: false });
    expect(editor.getHtml()).toContain('"on":false');
  });

  it('exportRuntime: false', async () => {
    editor = await createEditor({ exportRuntime: false });
    expect(editor.getHtml()).not.toContain('data-gjs-theme-runtime');
  });

  it('getRuntimeScript for the <head>', async () => {
    editor = await createEditor({ src: '/dr.js', choiceKey: 'k' });
    const tag = editor.DarkReader!.getRuntimeScript();
    expect(tag).toMatch(/^<script data-gjs-theme-runtime>/);
    expect(tag).toContain('"src":"/dr.js"');
    expect(tag).toContain('"key":"k"');
  });
});

describe('toggle component', () => {
  it('added into the selection (or the page), recognised when parsed, variants', async () => {
    editor = await createEditor();
    editor.select(editor.getWrapper()!.find('#sec')[0]);
    const t = editor.DarkReader!.addToggle();
    expect(t.is(TOGGLE_TYPE)).toBe(true);
    expect(t.parent().getId()).toBe('sec');
    expect(t.getAttributes()).toMatchObject({ type: 'button', 'data-gjs-theme-toggle': '' });
    t.set('variant', 'switch');
    expect(t.getClasses()).toContain('gjs-theme-toggle--switch');
    t.set('variant', 'icon');
    expect(t.getClasses()).not.toContain('gjs-theme-toggle--switch');
    const html = t.toHTML();
    editor.setComponents(`<div>${html.replace('class="gjs-theme-toggle"', 'class="gjs-theme-toggle gjs-theme-toggle--switch"')}</div>`);
    const parsed = editor.getWrapper()!.find('[data-gjs-theme-toggle]')[0];
    expect(parsed.is(TOGGLE_TYPE)).toBe(true);
    expect(parsed.get('variant')).toBe('switch');
  });
});

describe('preview', () => {
  it('enables Dark Reader in the frame and marks the document', async () => {
    editor = await createEditor();
    const dr = fakeDarkReader(editor);
    await editor.DarkReader!.setPreview(true);
    expect(dr.isOn()).toBe(true);
    const [, theme, fixes] = dr.calls.find((c) => c[0] === 'enable')! as [string, any, any];
    expect(theme.mode).toBe(1);
    expect(fixes.ignoreInlineStyle).toContain('[contenteditable="true"]');
    expect(fixes.css).toContain('html{background-color:#181a1b !important}');
    expect(frameDoc().documentElement.getAttribute('data-gjs-theme')).toBe('dark');
    expect(editor.Panels.getButton('options', 'gjs-darkreader-preview')!.get('active')).toBe(true);
    // settings change → re-applied
    editor.DarkReader!.setSettings({ brightness: 90 });
    await wait(200);
    const last = dr.calls.filter((c) => c[0] === 'enable').pop() as [string, any];
    expect(last[1].brightness).toBe(90);
    await editor.DarkReader!.setPreview(false);
    expect(dr.isOn()).toBe(false);
    expect(frameDoc().documentElement.getAttribute('data-gjs-theme')).toBe('light');
  });

  it('filter engine: a style in the frame, Dark Reader off', async () => {
    editor = await createEditor({ defaults: { scheme: 'dark' } });
    const dr = fakeDarkReader(editor);
    await editor.DarkReader!.setPreview(true);
    expect(dr.calls.find((c) => c[0] === 'enable')).toBeUndefined();
    expect(frameDoc().querySelector('style[data-gjs-darkreader-filter]')!.textContent).toContain('invert(100%)');
    expect(await editor.DarkReader!.exportCss()).toContain('invert(100%)');
    await editor.DarkReader!.setPreview(false);
    expect(frameDoc().querySelector('style[data-gjs-darkreader-filter]')).toBeNull();
  });

  it('the toggle in the canvas switches the preview only in the preview mode', async () => {
    editor = await createEditor();
    fakeDarkReader(editor);
    const frame = editor.Canvas.getFrameEl() as any;
    expect(frame.__gjsDarkReader).toBeTruthy();
    frame.__gjsDarkReader.click(new Event('click'), null);
    await wait();
    expect(editor.DarkReader!.isPreview()).toBe(false);
    editor.runCommand('preview');
    frame.__gjsDarkReader.click(new Event('click'), null);
    await wait();
    expect(editor.DarkReader!.isPreview()).toBe(true);
    editor.stopCommand('preview');
  });

  it('remembers the preview state', async () => {
    editor = await createEditor({ stateKey: 'dr-test' });
    fakeDarkReader(editor);
    await editor.DarkReader!.setPreview(true);
    expect(JSON.parse(localStorage.getItem('dr-test')!)).toEqual({ preview: true });
  });
});

describe('hygiene', () => {
  it('removes what Dark Reader writes into the DOM from the model', async () => {
    editor = await createEditor();
    const [c] = editor.getWrapper()!.append('<p id="p1" data-darkreader-inline-color="" style="color:red;--darkreader-inline-color:#f55">x<b data-darkreader-inline-bgcolor="">y</b></p>');
    expect(sanitizeComponent(c)).toBe(2);
    const html = editor.getHtml() + editor.getCss();
    expect(html).not.toMatch(/darkreader-inline/);
    expect(html).toMatch(/color:\s*red/);
  });

  it('patchRealm: frame classes accept the editor window’s nodes', async () => {
    editor = await createEditor();
    const win = editor.Canvas.getWindow() as any;
    const el = document.createElement('style');
    patchRealm(win, window);
    expect(el instanceof win.HTMLStyleElement).toBe(true);
    expect(el instanceof win.Element).toBe(true);
    expect(el instanceof win.HTMLLinkElement).toBe(false);
    expect(win.document.createElement('div') instanceof win.HTMLElement).toBe(true);
    expect(patchRealm(win, window)).toBe(false); // once
  });
});
