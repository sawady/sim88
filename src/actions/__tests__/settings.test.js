import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { legacy_createStore as createStore, applyMiddleware, combineReducers } from 'redux';
import { thunk } from 'redux-thunk';

import reducers from '../../reducers';
import {
  cleanSettings,
  detectLanguage,
  loadSavedSettings,
  loadSettings,
  setSettings,
  DEFAULT_TIMER_HZ,
  TIMER_PRESETS,
} from '../settings';
import { setConfig, reset, start, stop } from '../machine';
import { PRINT_INTERVAL } from '../../model/devices/printer';

const newStore = () => createStore(combineReducers(reducers), applyMiddleware(thunk));

// A program that never ends: only the timer changes.
const LOOP = 'ORG 2000h\nL: JMP L\nEND';

let saved;
beforeEach(() => {
  saved = new Map();
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (k) => (saved.has(k) ? saved.get(k) : null),
      setItem: (k, v) => saved.set(k, String(v)),
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('settings', () => {
  test('the language comes from the browser: the first one SIM88 speaks, else English', () => {
    expect(detectLanguage(['es-AR', 'en'])).toBe('es');
    expect(detectLanguage(['pt-BR', 'en-US', 'es'])).toBe('en');
    expect(detectLanguage(['fr', 'ES'])).toBe('es');
    expect(detectLanguage(['de'])).toBe('en');
    expect(detectLanguage([])).toBe('en');
  });

  test('defaults: classic blue theme, no CRT effect, timer at 1 Hz, printer every 8 instructions', () => {
    const s = loadSettings();
    expect(s).toMatchObject({ theme: 'borland', crt: false, zoom: 'auto', timerHz: 1, printInterval: 8, aluMode: 'msx88' });
    expect(DEFAULT_TIMER_HZ).toBe(1);
    expect(PRINT_INTERVAL).toBe(8);
    expect(TIMER_PRESETS).toEqual([0.5, 1, 2, 5, 10]);
  });

  test('invalid or unknown values are ignored', () => {
    expect(
      cleanSettings({ theme: 'nope', lang: 'fr', timerHz: 0, printInterval: 2.5, crt: 'yes', foo: 1, aluMode: '80286' })
    ).toEqual({});
    expect(cleanSettings({ theme: 'amber', timerHz: 0.5, printInterval: 3 })).toEqual({
      theme: 'amber',
      timerHz: 0.5,
      printInterval: 3,
    });
  });

  test('the theme, the language and the frequencies are remembered', () => {
    const store = newStore();
    store.dispatch(setSettings({ theme: 'green', lang: 'en', crt: true, timerHz: 5, printInterval: 2 }));
    expect(JSON.parse(saved.get('sim88.settings'))).toMatchObject({
      theme: 'green',
      lang: 'en',
      crt: true,
      timerHz: 5,
      printInterval: 2,
    });
    const again = newStore();
    again.dispatch(loadSavedSettings());
    expect(again.getState().settings).toMatchObject({ theme: 'green', lang: 'en', timerHz: 5 });
    expect(again.getState().machine.devices.printer.interval).toBe(2);
  });

  test('broken saved settings fall back to the defaults', () => {
    saved.set('sim88.settings', '{not json');
    expect(loadSettings().theme).toBe('borland');
  });
});

describe('timer frequency', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
  });

  const cont = (store) => store.getState().machine.devices.timer.cont;

  test('by default the timer counts one pulse per second while running', () => {
    const store = newStore();
    store.dispatch(start(LOOP));
    vi.advanceTimersByTime(3000);
    expect(cont(store)).toBe(3);
    store.dispatch(stop());
  });

  test.each([
    [0.5, 4000, 2],
    [2, 1000, 2],
    [5, 1000, 5],
    [10, 1500, 15],
    [3.5, 2000, 7], // a value of your own
  ])('at %s Hz, %s ms give %s pulses', (hz, ms, pulses) => {
    const store = newStore();
    store.dispatch(setSettings({ timerHz: hz }));
    store.dispatch(start(LOOP));
    vi.advanceTimersByTime(ms);
    expect(cont(store)).toBe(pulses);
    store.dispatch(stop());
  });

  test('changing the frequency while running applies at once', () => {
    const store = newStore();
    store.dispatch(start(LOOP));
    vi.advanceTimersByTime(1000);
    expect(cont(store)).toBe(1);
    store.dispatch(setSettings({ timerHz: 10 }));
    vi.advanceTimersByTime(1000);
    expect(cont(store)).toBe(11);
    store.dispatch(stop());
  });

  test('the clock does not run while stopped', () => {
    const store = newStore();
    store.dispatch(setSettings({ timerHz: 10 }));
    vi.advanceTimersByTime(2000);
    expect(cont(store)).toBe(0);
  });
});

describe('printer speed', () => {
  const interval = (store) => store.getState().machine.devices.printer.interval;

  test('is kept across resets, configuration changes and loading a program', () => {
    vi.useFakeTimers();
    const store = newStore();
    store.dispatch(setSettings({ printInterval: 3 }));
    expect(interval(store)).toBe(3);
    store.dispatch(setConfig(2));
    expect(interval(store)).toBe(3);
    store.dispatch(reset());
    expect(interval(store)).toBe(3);
    store.dispatch(start(LOOP));
    expect(interval(store)).toBe(3);
    store.dispatch(stop());
    vi.useRealTimers();
  });
});

describe('ALU mode', () => {
  const aluMode = (store) => store.getState().machine.aluMode;

  test('is MSX88 by default, reaches the machine and is remembered', () => {
    const store = newStore();
    expect(store.getState().settings.aluMode).toBe('msx88');
    expect(aluMode(store)).toBe('msx88');
    store.dispatch(setSettings({ aluMode: '8086' }));
    expect(store.getState().settings.aluMode).toBe('8086');
    expect(aluMode(store)).toBe('8086');
    expect(JSON.parse(saved.get('sim88.settings')).aluMode).toBe('8086');

    const again = newStore();
    again.dispatch(loadSavedSettings());
    expect(again.getState().settings.aluMode).toBe('8086');
    expect(aluMode(again)).toBe('8086');
  });

  test('an invalid mode is ignored', () => {
    const store = newStore();
    store.dispatch(setSettings({ aluMode: '8086' }));
    store.dispatch(setSettings({ aluMode: 'MSX88' }));
    expect(aluMode(store)).toBe('8086');
  });

  test('is kept across resets, configuration changes and loading a program', () => {
    vi.useFakeTimers();
    const store = newStore();
    store.dispatch(setSettings({ aluMode: '8086' }));
    store.dispatch(setConfig(2));
    expect(aluMode(store)).toBe('8086');
    store.dispatch(reset());
    expect(aluMode(store)).toBe('8086');
    store.dispatch(start(LOOP));
    expect(aluMode(store)).toBe('8086');
    store.dispatch(stop());
    vi.useRealTimers();
  });
});
