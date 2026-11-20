import { afterEach, describe, expect, it } from 'vitest';
import grapesjs, { type Editor } from 'grapesjs';
import plugin, { META, VERSION } from '../src/index';
import { CONTROLS, definePlugin, type PluginControl } from '../src/contract';
import { createEditor, destroyEditor } from './helpers/editor';
import pkg from '../package.json';

const control = (ed: object): PluginControl => (ed as Record<symbol, Map<string, PluginControl>>)[CONTROLS].get(META.id)!;
let editor: Editor | undefined;
afterEach(async () => {
  await destroyEditor(editor);
  editor = undefined;
});

describe('plugin contract', () => {
  it('meta: id = npm name, version = package.json, registered by id', () => {
    expect(META.id).toBe(pkg.name);
    expect(VERSION).toBe(pkg.version);
    expect((plugin as unknown as { meta: unknown }).meta).toBe(META);
    (globalThis as { grapesjs?: unknown }).grapesjs = grapesjs;
    definePlugin(plugin, META);
    expect(grapesjs.plugins.get(META.id)).toBe(plugin);
  });

  it('export options apply live; the rest after a reload', async () => {
    editor = await createEditor();
    const c = control(editor);
    expect(c.getOptions()).toMatchObject({ exportRuntime: true, antiFlash: true, choiceKey: 'gjs-theme' });
    expect(c.setOptions({ exportRuntime: false, choiceKey: 'x', storageKey: 'y' })).toEqual({ applied: ['exportRuntime', 'choiceKey'], reload: ['storageKey'] });
    expect(editor.getHtml()).not.toContain('data-gjs-theme-runtime');
    expect(editor.DarkReader!.getRuntimeConfig().key).toBe('x');
  });
});
