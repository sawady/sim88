import { describe, expect, test } from 'vitest';
import { chooseFontSize, layout, measure, MIN_COLS, MIN_ROWS, WINDOW_IDS } from '../grid';

// Screens: CSS size and device pixel ratio.
const screens = {
  'notebook 1366x768': { width: 1366, height: 700, dpr: 1 },
  'notebook 1536x864 at 125%': { width: 1536, height: 790, dpr: 1.25 },
  'notebook 1280x720 at 150%': { width: 1280, height: 650, dpr: 1.5 },
  'monitor 1920x1080': { width: 1920, height: 1000, dpr: 1 },
  'monitor 2560x1440': { width: 2560, height: 1340, dpr: 1 },
  'retina 1440x900': { width: 1440, height: 820, dpr: 2 },
  'phone 390x844': { width: 390, height: 760, dpr: 3 },
};

const crisp = (fs, dpr) => Number.isInteger(Math.round(fs * dpr * 1000) / 1000 / 16);

describe('font size', () => {
  test.each(Object.entries(screens))('%s: readable, and a whole factor of 8x16 when it fits', (name, s) => {
    const fs = chooseFontSize(s);
    expect(fs).toBeGreaterThanOrEqual(14);
    const { cols, rows } = measure(s);
    if (cols >= MIN_COLS && rows >= MIN_ROWS && crisp(16, s.dpr)) expect(crisp(fs, s.dpr)).toBe(true);
  });

  test('takes the largest whole factor that keeps the side by side layout', () => {
    // 2x would give 85x21 cells
    expect(chooseFontSize(screens['notebook 1366x768'])).toBe(16);
    // 2x: 120x31 cells
    expect(chooseFontSize(screens['monitor 1920x1080'])).toBe(32);
    // 3x would give 106x27
    expect(chooseFontSize(screens['monitor 2560x1440'])).toBe(32);
    // 3x of the device pixels: 24 CSS px, 120x34 cells
    expect(chooseFontSize(screens['retina 1440x900'])).toBe(24);
    // 2x of the device pixels: 25.6 CSS px, 120x30 cells
    expect(chooseFontSize(screens['notebook 1536x864 at 125%'])).toBe(25.6);
    // 2x would be 21.3 CSS px and 120x30 cells
    expect(chooseFontSize(screens['notebook 1280x720 at 150%'])).toBeCloseTo(21.33, 2);
    // nothing fits side by side: a whole factor that can be read
    expect(chooseFontSize(screens['phone 390x844'])).toBe(16);
  });

  test('a zoom factor is that many times 16 device pixels', () => {
    expect(chooseFontSize({ width: 800, height: 600, dpr: 1, zoom: 2 })).toBe(32);
    expect(chooseFontSize({ width: 800, height: 600, dpr: 2, zoom: 3 })).toBe(24);
    expect(chooseFontSize({ width: 800, height: 600, dpr: 1.25, zoom: 1 })).toBe(12.8);
  });
});

describe('layout', () => {
  const inside = (r, cols, rows) => r.x >= 0 && r.y >= 1 && r.x + r.w + 2 <= cols && r.y + r.h + 1 <= rows - 1;
  const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

  test.each([
    [112, 30],
    [128, 40],
    [170, 43],
    [240, 62],
  ])('%sx%s: side by side, inside the screen with room for shadows, without overlaps', (cols, rows) => {
    const { mode, windows } = layout(cols, rows);
    expect(mode).toBe('wide');
    for (const id of WINDOW_IDS) expect(inside(windows[id], cols, rows), id).toBe(true);
    for (const a of WINDOW_IDS) {
      for (const b of WINDOW_IDS) if (a < b) expect(overlap(windows[a], windows[b]), `${a} ${b}`).toBe(false);
    }
    expect(windows.cpu.w - 2).toBeGreaterThanOrEqual(36); // what the CPU view needs
    expect(windows.cpu.h).toBeGreaterThanOrEqual(17);
    expect(windows.editor.w).toBeGreaterThanOrEqual(40);
  });

  test('small screens stack the windows and scroll', () => {
    const { mode, windows, rows } = layout(48, 47);
    expect(mode).toBe('stacked');
    let y = 0;
    for (const id of WINDOW_IDS) {
      expect(windows[id].y).toBeGreaterThan(y);
      y = windows[id].y + windows[id].h;
    }
    expect(rows).toBeGreaterThan(y);
  });
});
