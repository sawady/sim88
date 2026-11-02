import { describe, expect, test } from 'vitest';
import { DICTIONARIES, t, tMarked, hotkey } from '../core';

const { es, en } = DICTIONARIES;
const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('dictionaries', () => {
  test('Spanish and English have the same keys', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort());
  });

  test.each(Object.keys(es))('%s: non-empty, same placeholders and hotkey marks in both', (key) => {
    for (const dict of [es, en]) {
      expect(typeof dict[key]).toBe('string');
      expect(dict[key].trim()).not.toBe('');
      expect((dict[key].match(/~/g) || []).length).toBeLessThanOrEqual(1);
      expect(dict[key]).not.toMatch(/~(\s|$)/);
    }
    expect([...new Set(placeholders(en[key]))]).toEqual([...new Set(placeholders(es[key]))]);
    expect(en[key].includes('~')).toBe(es[key].includes('~'));
  });

  // Items of the same menu (and the menu bar) need different hotkeys.
  const menus = {
    bar: ['menu.file', 'menu.examples', 'menu.run', 'menu.options', 'menu.help'],
    file: Object.keys(es).filter((k) => k.startsWith('menu.file.')),
    run: Object.keys(es).filter((k) => k.startsWith('menu.run.')),
    options: Object.keys(es).filter((k) => k.startsWith('menu.options.')),
    help: Object.keys(es).filter((k) => k.startsWith('menu.help.')),
    sim: ['dlg.sim.timer', 'dlg.sim.printer', 'dlg.ok', 'dlg.cancel'],
    look: ['dlg.look.theme', 'dlg.look.crt', 'dlg.look.zoom', 'dlg.ok', 'dlg.cancel'],
    alu: ['dlg.alu.mode', 'dlg.ok', 'dlg.cancel'],
  };
  test.each(Object.entries(menus))('hotkeys of %s are unique in both languages', (name, keys) => {
    for (const dict of [es, en]) {
      const letters = keys.map((k) => hotkey(dict[k]).key.toLowerCase());
      expect(letters.every(Boolean)).toBe(true);
      expect(new Set(letters).size).toBe(letters.length);
    }
  });
});

describe('t', () => {
  test('replaces parameters and removes the hotkey mark', () => {
    expect(t('es', 'editor.errorAt', { line: 3, message: 'x' })).toBe('Línea 3: x');
    expect(t('en', 'editor.errorAt', { line: 3, message: 'x' })).toBe('Line 3: x');
    expect(t('es', 'menu.file')).toBe('Archivo');
    expect(tMarked('es', 'menu.file')).toBe('~Archivo');
    expect(hotkey(tMarked('en', 'menu.examples'))).toEqual({ before: 'E', key: 'x', after: 'amples' });
  });

  test('a missing key falls back to Spanish, then to the key', () => {
    expect(t('fr', 'menu.file')).toBe('Archivo');
    expect(t('en', 'no.such.key')).toBe('no.such.key');
  });
});
