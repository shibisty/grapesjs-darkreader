import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  diffSettings,
  effectiveEngine,
  filterCss,
  generatedScheme,
  normalizeSettings,
  preInvert,
  selectorList,
  toDarkReader,
} from '../src/settings';

describe('settings', () => {
  it('normalizes garbage to the defaults', () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings({ scheme: 'blue', brightness: 'x', darkBackground: 'url(x)', engine: 'gpu' })).toEqual(DEFAULT_SETTINGS);
  });

  it('clamps numbers, keeps valid colours and special values', () => {
    const s = normalizeSettings({ brightness: 500, contrast: 10, sepia: 33.4, darkBackground: ' #000 ', selectionColor: '', scrollbarColor: 'auto', lightText: 'rgb(1, 2, 3)' });
    expect(s).toMatchObject({ brightness: 150, contrast: 50, sepia: 33, darkBackground: '#000', selectionColor: '', scrollbarColor: 'auto', lightText: 'rgb(1, 2, 3)' });
  });

  it('a patch is merged onto the base', () => {
    const base = normalizeSettings({ scheme: 'dark', sepia: 10 });
    expect(normalizeSettings({ sepia: 20 }, base)).toMatchObject({ scheme: 'dark', sepia: 20 });
  });

  it('selector lists from text or arrays, without blanks and duplicates', () => {
    expect(selectorList('.a\n\n img.b \n.a')).toEqual(['.a', 'img.b']);
    expect(selectorList(['#x', ' ', '#x', '.y'])).toEqual(['#x', '.y']);
    expect(normalizeSettings({ invert: '.logo\n.map' }).invert).toEqual(['.logo', '.map']);
  });

  it('diff keeps only what differs from the defaults', () => {
    expect(diffSettings(DEFAULT_SETTINGS)).toEqual({});
    expect(diffSettings(normalizeSettings({ sepia: 5, invert: ['.a'] }))).toEqual({ sepia: 5, invert: ['.a'] });
  });

  it('Dark Reader arguments: light design → dark mode (1), dark design → light mode (0)', () => {
    const { theme, fixes } = toDarkReader(normalizeSettings({ invert: ['.logo'], css: 'a{}' }), { ignoreInlineStyle: ['[x]'], css: 'b{}' });
    expect(theme.mode).toBe(1);
    expect(theme.darkSchemeBackgroundColor).toBe('#181a1b');
    expect(fixes).toMatchObject({ url: ['*'], invert: ['.logo'], ignoreInlineStyle: ['[x]'], css: 'a{}\nb{}' });
    expect(toDarkReader(normalizeSettings({ scheme: 'dark' })).theme.mode).toBe(0);
  });

  it('engine: auto is dynamic for a light design, filter for a dark one', () => {
    expect(effectiveEngine(DEFAULT_SETTINGS)).toBe('dynamic');
    expect(effectiveEngine(normalizeSettings({ scheme: 'dark' }))).toBe('filter');
    expect(effectiveEngine(normalizeSettings({ scheme: 'dark', engine: 'dynamic' }))).toBe('dynamic');
    expect(generatedScheme(normalizeSettings({ scheme: 'dark' }))).toBe('light');
  });

  it('filter CSS inverts the page and re-inverts media and the invert list', () => {
    const css = filterCss(normalizeSettings({ scheme: 'dark', brightness: 90, invert: ['.logo'], css: '.x{color:red}' }));
    expect(css).toContain('filter:invert(100%) hue-rotate(180deg) brightness(90%) !important');
    expect(css).toMatch(/img,\n[\s\S]*\.logo\{-webkit-filter:invert\(100%\) hue-rotate\(180deg\)/);
    expect(css).toContain('.x{color:red}');
    // background: what the inversion turns into the light background
    expect(css).toContain(`background:${preInvert('#dcdad7')} !important`);
    expect(preInvert('#fff')).toBe('#000000');
    expect(preInvert('#dcdad7')).toBe('#232528');
    expect(preInvert('red')).toBe('red');
  });
});
