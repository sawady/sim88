// User preferences: language, theme, CRT effect, size of the text grid, the
// speed of the timer clock and the printer, and the ALU mode (as MSX88 or as
// a real 8086). They are kept in localStorage.

import { storage } from '../storage';
import { MACHINE_STATES } from '../model/constants';
import { PRINT_INTERVAL } from '../model/devices/printer';
import { DEFAULT_ALU_MODE } from '../model/alu';
import { restartClock } from './machine';
import { translateExample } from './editor';

export const LANGUAGES = ['es', 'en'];
export const THEMES = ['borland', 'msx88', 'green', 'amber', 'contrast'];
export const ZOOMS = ['auto', 1, 2, 3];
// Where MSX88 and the 8086 differ (INC/DEC, ADC/SBB, NOT, PUSH SP): copy
// MSX88 (the default, as the original) or do what a real 8086 does.
export const ALU_MODE_IDS = [DEFAULT_ALU_MODE, '8086'];

export const TIMER_PRESETS = [0.5, 1, 2, 5, 10]; // Hz
export const MIN_TIMER_HZ = 0.1;
export const MAX_TIMER_HZ = 50;
export const DEFAULT_TIMER_HZ = 1;

export const PRINT_PRESETS = [1, 2, 4, 8, 16, 32]; // instructions per character
export const MIN_PRINT_INTERVAL = 1;
export const MAX_PRINT_INTERVAL = 1000;

export const SET_SETTINGS = 'SET_SETTINGS';
export const SET_PRINT_INTERVAL = 'SET_PRINT_INTERVAL';
export const SET_ALU_MODE = 'SET_ALU_MODE';

const KEY = 'sim88.settings';

// The first of the browser's languages that SIM88 speaks, or English.
export function detectLanguage(languages = globalThis.navigator?.languages ?? []) {
  for (const tag of languages) {
    const lang = String(tag).slice(0, 2).toLowerCase();
    if (LANGUAGES.includes(lang)) return lang;
  }
  return 'en';
}

export const validTimerHz = (hz) =>
  typeof hz === 'number' && Number.isFinite(hz) && hz >= MIN_TIMER_HZ && hz <= MAX_TIMER_HZ;

export const validPrintInterval = (n) =>
  Number.isInteger(n) && n >= MIN_PRINT_INTERVAL && n <= MAX_PRINT_INTERVAL;

export const defaultSettings = () => ({
  lang: detectLanguage(),
  theme: THEMES[0],
  crt: false,
  zoom: 'auto',
  timerHz: DEFAULT_TIMER_HZ,
  printInterval: PRINT_INTERVAL,
  aluMode: DEFAULT_ALU_MODE,
});

const VALID = {
  lang: (v) => LANGUAGES.includes(v),
  theme: (v) => THEMES.includes(v),
  crt: (v) => typeof v === 'boolean',
  zoom: (v) => ZOOMS.includes(v),
  timerHz: validTimerHz,
  printInterval: validPrintInterval,
  aluMode: (v) => ALU_MODE_IDS.includes(v),
};

// Keeps only known settings with valid values.
export function cleanSettings(values) {
  const clean = {};
  for (const [key, value] of Object.entries(values || {})) {
    if (VALID[key] && VALID[key](value)) clean[key] = value;
  }
  return clean;
}

export function loadSettings() {
  let saved = {};
  try {
    saved = JSON.parse(storage.get(KEY)) || {};
  } catch (e) {
    saved = {};
  }
  return { ...defaultSettings(), ...cleanSettings(saved) };
}

// Changes some settings (invalid values are ignored) and remembers them.
export const setSettings = (changes) => (dispatch, getState) => {
  const clean = cleanSettings(changes);
  dispatch({ type: SET_SETTINGS, settings: clean });
  const { settings, machine } = getState();
  storage.set(KEY, JSON.stringify(settings));
  if ('printInterval' in clean) {
    dispatch({ type: SET_PRINT_INTERVAL, interval: clean.printInterval });
  }
  if ('aluMode' in clean) {
    dispatch({ type: SET_ALU_MODE, mode: clean.aluMode });
  }
  if ('lang' in clean) {
    dispatch(translateExample());
  }
  if ('timerHz' in clean && machine.state === MACHINE_STATES.RUNNING) {
    dispatch(restartClock());
  }
};

// At startup: the saved settings, applied to the machine too.
export const loadSavedSettings = () => (dispatch) => {
  const settings = loadSettings();
  dispatch({ type: SET_SETTINGS, settings });
  dispatch({ type: SET_PRINT_INTERVAL, interval: settings.printInterval });
  dispatch({ type: SET_ALU_MODE, mode: settings.aluMode });
};
