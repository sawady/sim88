// The screen is a grid of character cells of 8x16 font pixels. These pure
// functions choose the size of the font for the browser window and place the
// windows of the simulator on the grid (as Turbo Vision does).

import { createContext, useContext, useEffect, useState } from 'react';

export const BASE = 16; // the font is 8x16
export const MIN_FONT = 14; // CSS px; smaller is hard to read
export const MIN_COLS = 112; // the side by side layout needs this many columns
export const MIN_ROWS = 30; // and rows

// Font size in CSS px. `zoom` is 'auto' or a whole factor: 16·zoom device
// pixels, so every font pixel is a whole number of screen pixels. 'auto'
// takes the largest whole factor that keeps the side by side layout, and
// falls back to 16 or 14 CSS px (blurrier on fractional pixel ratios), and
// last to a whole factor for a small screen, where windows are stacked.
export function chooseFontSize({ width, height, dpr = 1, zoom = 'auto' }) {
  const fits = (fs) => Math.floor(width / (fs / 2)) >= MIN_COLS && Math.floor(height / fs) >= MIN_ROWS;
  if (zoom !== 'auto') return (BASE * zoom) / dpr;
  for (let k = 8; k >= 1; k--) {
    const fs = (BASE * k) / dpr;
    if (fs >= MIN_FONT && fits(fs)) return fs;
  }
  if (fits(16)) return 16;
  if (fits(MIN_FONT)) return MIN_FONT;
  const k = Math.max(1, Math.ceil((MIN_FONT * dpr) / BASE));
  return (BASE * k) / dpr;
}

export function measure({ width, height, dpr = 1, zoom = 'auto' }) {
  const fs = chooseFontSize({ width, height, dpr, zoom });
  const cw = fs / 2;
  return { fs, cw, ch: fs, cols: Math.max(20, Math.floor(width / cw)), rows: Math.max(10, Math.floor(height / fs)) };
}

export const WINDOW_IDS = ['editor', 'cpu', 'memory', 'screen', 'peripherals'];

const CPU_W = 38;
const MEMORY_W = 18;
const GAP = 2; // columns between windows: their shadow is 2 columns wide

// Places the windows: { mode, rows, windows: { id: { x, y, w, h } } }. Row 0
// is the menu bar and the last one the status bar. Windows leave room for
// their shadows (2 columns to the right, 1 row below).
export function layout(cols, rows) {
  const height = rows - 3; // menu bar, shadow row, status bar
  if (cols >= MIN_COLS && rows >= MIN_ROWS) {
    const memX = cols - GAP - MEMORY_W;
    const cpuX = memX - GAP - CPU_W;
    const edW = cpuX - GAP;
    const cpuH = Math.min(17, height - 10);
    const screenH = Math.max(7, Math.min(14, Math.round(height * 0.3)));
    return {
      mode: 'wide',
      rows,
      windows: {
        editor: { x: 0, y: 1, w: edW, h: height - screenH - 1 },
        cpu: { x: cpuX, y: 1, w: CPU_W, h: cpuH },
        memory: { x: memX, y: 1, w: MEMORY_W, h: height },
        screen: { x: 0, y: height - screenH + 1, w: edW, h: screenH },
        peripherals: { x: cpuX, y: cpuH + 2, w: CPU_W, h: height - cpuH - 1 },
      },
    };
  }
  // Small screens: one window under the other, the page scrolls.
  const w = cols - GAP;
  const heights = { editor: 18, cpu: 17, memory: 12, screen: 8, peripherals: 22 };
  const windows = {};
  let y = 1;
  for (const id of WINDOW_IDS) {
    windows[id] = { x: 0, y, w, h: heights[id] };
    y += heights[id] + 1;
  }
  return { mode: 'stacked', rows: Math.max(rows, y + 1), windows };
}

export const GridContext = createContext({ fs: 16, cw: 8, ch: 16, cols: 80, rows: 25 });
export const useGrid = () => useContext(GridContext);

const viewport = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
  dpr: window.devicePixelRatio || 1,
});

// Measures the browser window (again on resize or zoom) for a zoom setting.
export function useTextGrid(zoom) {
  const [size, setSize] = useState(viewport);
  useEffect(() => {
    const update = () => setSize(viewport());
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return measure({ ...size, zoom });
}
