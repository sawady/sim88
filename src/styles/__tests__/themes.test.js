import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import { THEMES } from '../../actions/settings';
import { DICTIONARIES } from '../../i18n/core';

// Parses themes.css: { theme: { variable: value } }.
const css = readFileSync(join(__dirname, '..', 'themes.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const themes = {};
for (const [, selectors, body] of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
  const vars = Object.fromEntries([...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
  for (const [, name] of selectors.matchAll(/data-theme='([\w-]+)'/g)) themes[name] = vars;
}

// WCAG 2 relative luminance and contrast ratio.
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
export const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// [foreground, background, minimum]: 4.5 for text, 3 for hotkey letters
// (the word is readable anyway) and for non-text marks (LEDs, focus).
// A `transparent` background is the one behind it (the second choice).
const PAIRS = [
  ['win-fg', 'win-bg', 4.5],
  // Frames are lines; their titles use title-fg.
  ['win-frame', 'win-bg', 3],
  ['win-frame-active', 'win-bg', 3],
  ['title-fg', ['title-bg', 'win-bg'], 4.5],
  ['label', 'win-bg', 4.5],
  ['dim', 'win-bg', 4.5],
  ['val-fg', ['val-bg', 'win-bg'], 4.5],
  ['act-fg', 'act-bg', 4.5],
  ['ip-fg', 'ip-bg', 4.5],
  ['sp-fg', 'win-bg', 4.5],
  ['addr-fg', ['addr-bg', 'win-bg'], 4.5],
  ['mval-fg', ['mval-bg', 'win-bg'], 4.5],
  ['on-fg', 'on-bg', 4.5],
  ['off-fg', 'win-bg', 4.5],
  ['led-on', 'win-bg', 3],
  ['bar-fg', 'bar-bg', 4.5],
  ['bar-hot', 'bar-bg', 3],
  ['bar-sel-fg', 'bar-sel-bg', 4.5],
  ['ed-fg', 'ed-bg', 4.5],
  ['ed-kw', 'ed-bg', 4.5],
  ['ed-reg', 'ed-bg', 4.5],
  ['ed-num', 'ed-bg', 4.5],
  ['ed-str', 'ed-bg', 4.5],
  ['ed-com', 'ed-bg', 4.5],
  ['ed-dir', 'ed-bg', 4.5],
  ['ed-lbl', 'ed-bg', 4.5],
  ['ed-gutter', 'ed-bg', 4.5],
  ['ed-cursor', 'ed-bg', 3],
  // The source stays readable on the line being run and on an error line.
  ...['ed-run', 'ed-err'].flatMap((line) => [
    ...['ed-fg', 'ed-kw', 'ed-reg', 'ed-num', 'ed-lbl'].map((fg) => [fg, line, 4.5]),
    ...['ed-str', 'ed-com', 'ed-dir', 'ed-cursor'].map((fg) => [fg, line, 3]),
  ]),
  ['con-fg', 'con-bg', 4.5],
  ['dlg-fg', 'dlg-bg', 4.5],
  ['dlg-title', 'dlg-bg', 4.5],
  ['dlg-hot', 'dlg-bg', 3],
  ['btn-fg', 'btn-bg', 4.5],
  ['btn-hot', 'btn-bg', 3],
  ['btn-focus-fg', 'btn-focus-bg', 4.5],
  ['fld-fg', 'fld-bg', 4.5],
  ['wfld-fg', 'wfld-bg', 4.5],
  ['err-fg', 'err-bg', 4.5],
  ['msg-fg', 'msg-bg', 4.5],
  // Outline of the focused element in windows; in dialogs and menus the
  // focused item takes the bar-sel colors.
  ['focus', 'win-bg', 3],
  ['focus', 'ed-bg', 3],
  ['focus', 'con-bg', 3],
];

const color = (vars, names) => {
  for (const name of [].concat(names)) {
    if (vars[name] && vars[name] !== 'transparent') return vars[name];
  }
  return undefined;
};

describe('themes', () => {
  test('every theme of the settings is in themes.css and has a name in both languages', () => {
    expect(Object.keys(themes).sort()).toEqual([...THEMES].sort());
    for (const theme of THEMES) {
      expect(DICTIONARIES.es[`theme.${theme}`]).toBeTruthy();
      expect(DICTIONARIES.en[`theme.${theme}`]).toBeTruthy();
    }
  });

  test.each(THEMES)('%s defines the same variables as the default theme', (theme) => {
    expect(Object.keys(themes[theme]).sort()).toEqual(Object.keys(themes.borland).sort());
    for (const value of Object.values(themes[theme])) {
      expect(value).toMatch(/^(#[0-9a-f]{6}|transparent|none|underline)$/);
    }
  });

  test.each(THEMES.flatMap((theme) => PAIRS.map(([fg, bg, min]) => [theme, fg, [].concat(bg)[0], min, bg])))(
    '%s: %s on %s has a contrast of at least %s',
    (theme, fg, _, min, bg) => {
      const vars = themes[theme];
      const ratio = contrast(color(vars, fg), color(vars, bg));
      expect(ratio, `${theme}: ${vars[fg]} on ${color(vars, bg)}`).toBeGreaterThanOrEqual(min);
    }
  );
});
