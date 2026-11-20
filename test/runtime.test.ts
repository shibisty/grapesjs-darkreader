import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bootRuntime, exportScript, runtimeScriptTag, runtimeSource, type RuntimeConfig } from '../src/runtime';
import { filterCss, normalizeSettings, toDarkReader } from '../src/settings';

function config(patch: Partial<RuntimeConfig> = {}): RuntimeConfig {
  const s = normalizeSettings({});
  const { theme, fixes } = toDarkReader(s);
  return {
    on: true,
    src: '/darkreader.js',
    scheme: 'light',
    generated: 'dark',
    initial: 'system',
    remember: true,
    key: 'gjs-theme',
    antiFlash: true,
    flashBackground: '#181a1b',
    engine: 'dynamic',
    filterCss: '',
    theme,
    fixes,
    ...patch,
  };
}

let systemDark = false;
const mqListeners: Array<() => void> = [];
let dr: { enable: ReturnType<typeof vi.fn>; disable: ReturnType<typeof vi.fn> };

beforeEach(() => {
  systemDark = false;
  mqListeners.length = 0;
  (window as any).matchMedia = (q: string) => ({
    media: q,
    get matches() {
      return systemDark;
    },
    addEventListener: (_: string, fn: () => void) => mqListeners.push(fn),
  });
  dr = { enable: vi.fn(), disable: vi.fn() };
  (window as any).DarkReader = dr;
});
afterEach(() => {
  delete (window as any).matchMedia;
});

const theme = () => document.documentElement.getAttribute('data-gjs-theme');

describe('runtime', () => {
  it('follows the system scheme', () => {
    systemDark = true;
    bootRuntime(config());
    expect(theme()).toBe('dark');
    expect(dr.enable).toHaveBeenCalledTimes(1);
    expect(dr.enable.mock.calls[0][0]).toMatchObject({ mode: 1 });
    expect((window as any).gjsTheme.isGenerated()).toBe(true);
    // the system switches to light
    systemDark = false;
    mqListeners.forEach((f) => f());
    expect(theme()).toBe('light');
    expect(dr.disable).toHaveBeenCalled();
  });

  it('a toggle switches and remembers; the remembered choice wins over the system', () => {
    const btn = document.createElement('button');
    document.body.append(btn);
    bootRuntime(config(), btn);
    expect(theme()).toBe('light');
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    btn.click();
    expect(theme()).toBe('dark');
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    expect(localStorage.getItem('gjs-theme')).toBe('generated');
    // a new page load
    delete (window as any).gjsTheme;
    bootRuntime(config());
    expect(theme()).toBe('dark');
    (window as any).gjsTheme.set('system');
    expect(localStorage.getItem('gjs-theme')).toBeNull();
    expect(theme()).toBe('light');
  });

  it('remember:false keeps nothing; initial:generated starts generated', () => {
    bootRuntime(config({ remember: false, initial: 'generated' }));
    expect(theme()).toBe('dark');
    (window as any).gjsTheme.toggle();
    expect(theme()).toBe('light');
    expect(localStorage.getItem('gjs-theme')).toBeNull();
  });

  it('binds [data-gjs-theme-toggle] elements of the page; on() reports changes', () => {
    document.body.innerHTML = '<button data-gjs-theme-toggle id="a"></button><a data-gjs-theme-toggle id="b" href="#"></a>';
    bootRuntime(config());
    const seen: string[] = [];
    (window as any).gjsTheme.on((e: { scheme: string }) => seen.push(e.scheme));
    (document.getElementById('b') as HTMLElement).click();
    expect(document.getElementById('a')!.getAttribute('aria-pressed')).toBe('true');
    expect(seen).toEqual(['dark']);
  });

  it('set() takes dark / light / original / generated', () => {
    bootRuntime(config({ scheme: 'dark', generated: 'light', engine: 'filter', filterCss: 'html{filter:invert(1)}', initial: 'original' }));
    const api = (window as any).gjsTheme;
    expect(api.get()).toBe('dark');
    api.set('light');
    expect(api.get()).toBe('light');
    expect(api.isGenerated()).toBe(true);
    api.set('original');
    expect(api.get()).toBe('dark');
  });

  it('filter engine: a <style>, no Dark Reader', () => {
    delete (window as any).DarkReader;
    const css = filterCss(normalizeSettings({ scheme: 'dark' }));
    bootRuntime(config({ scheme: 'dark', generated: 'light', engine: 'filter', filterCss: css, initial: 'generated' }));
    const st = document.querySelector('style[data-gjs-theme-filter]');
    expect(st?.textContent).toBe(css);
    expect(document.querySelector('script[data-gjs-theme-engine]')).toBeNull();
    (window as any).gjsTheme.toggle();
    expect(document.querySelector('style[data-gjs-theme-filter]')).toBeNull();
  });

  it('dynamic engine without Dark Reader on the page: loads it, hides the page meanwhile', () => {
    delete (window as any).DarkReader;
    bootRuntime(config({ initial: 'generated' }));
    const s = document.querySelector<HTMLScriptElement>('script[data-gjs-theme-engine]')!;
    expect(s.getAttribute('src')).toBe('/darkreader.js');
    expect(document.querySelector('[data-gjs-theme-flash]')).toBeTruthy();
    (window as any).DarkReader = dr;
    s.onload!(new Event('load'));
    expect(dr.enable).toHaveBeenCalled();
    expect(document.querySelector('[data-gjs-theme-flash]')).toBeNull();
  });

  it('does nothing when off or inside the GrapesJS canvas', () => {
    bootRuntime(config({ on: false }));
    expect((window as any).gjsTheme).toBeUndefined();
    const spy = vi.spyOn(window, 'frameElement', 'get').mockReturnValue(Object.assign(document.createElement('iframe'), { className: 'gjs-frame' }));
    bootRuntime(config());
    expect((window as any).gjsTheme).toBeUndefined();
    spy.mockRestore();
  });

  it('serialised source runs on its own (no outer references)', () => {
    systemDark = true;
    // eslint-disable-next-line no-new-func
    new Function(`${runtimeSource()}(${JSON.stringify(config())});`)();
    expect(theme()).toBe('dark');
    const fn = new Function(`return (${exportScript()})`)();
    delete (window as any).gjsTheme;
    const btn = document.createElement('button');
    fn.call(btn, { config: config() });
    expect(btn.getAttribute('aria-pressed')).toBe('true');
  });

  it('script tag escapes </script> in the config', () => {
    const tag = runtimeScriptTag(config({ filterCss: '</script><b>' }));
    expect(tag.indexOf('</script>')).toBe(tag.length - '</script>'.length);
    expect(tag).toContain('\\u003c/script>');
  });
});
