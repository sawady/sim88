import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { legacy_createStore as createStore, applyMiddleware, combineReducers } from 'redux';
import { thunk } from 'redux-thunk';

import reducers from '../../reducers';
import { changeText, loadExample, loadInitialProgram, persistProgram } from '../editor';
import { setSettings, SET_SETTINGS } from '../settings';
import { DEFAULT_EXAMPLE, EXAMPLES } from '../../examples';

const newStore = (lang = 'es') => {
  const store = createStore(combineReducers(reducers), applyMiddleware(thunk));
  store.dispatch({ type: SET_SETTINGS, settings: { lang } });
  return store;
};

describe('program persistence and examples', () => {
  let saved;
  beforeEach(() => {
    saved = new Map();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (k) => (saved.has(k) ? saved.get(k) : null),
        setItem: (k, v) => saved.set(k, String(v)),
      },
    });
    vi.stubGlobal('document', { title: '' });
  });
  afterEach(() => vi.unstubAllGlobals());

  test('the first time, the default example is loaded', () => {
    const store = newStore();
    store.dispatch(loadInitialProgram());
    expect(store.getState().editor.text).toBe(DEFAULT_EXAMPLE.versions.es.source);
  });

  test('the program being edited survives a reload', () => {
    const first = newStore();
    persistProgram(first);
    first.dispatch(loadInitialProgram());
    first.dispatch(changeText('ORG 2000h\nHLT\nEND'));

    const second = newStore(); // "reload"
    second.dispatch(loadInitialProgram());
    expect(second.getState().editor.text).toBe('ORG 2000h\nHLT\nEND');
    expect(second.getState().editor.filepath).toBe('01-suma-tabla.asm');
  });

  test('without localStorage nothing breaks', () => {
    vi.stubGlobal('window', {
      get localStorage() {
        throw new Error('blocked');
      },
    });
    const store = newStore();
    persistProgram(store);
    store.dispatch(loadInitialProgram());
    store.dispatch(changeText('x'));
    expect(store.getState().editor.text).toBe('x');
  });

  test('an example selects the configuration it needs', () => {
    const store = newStore();
    store.dispatch(loadExample('08-impresora-hand'));
    expect(store.getState().editor.filepath).toBe('08-impresora-hand.asm');
    expect(store.getState().editor.text).toMatch(/HAND/);
    expect(store.getState().machine.bus.config).toBe(2);
  });

  test('in English, the first visit and the menu give the English examples', () => {
    const store = newStore('en');
    store.dispatch(loadInitialProgram());
    expect(store.getState().editor.text).toBe(DEFAULT_EXAMPLE.versions.en.source);
    expect(store.getState().editor.filepath).toBe('01-table-sum.asm');
    store.dispatch(loadExample('08-impresora-hand'));
    expect(store.getState().editor.filepath).toBe('08-printer-hand.asm');
    expect(store.getState().editor.text).toMatch(/HELLO WORLD/);
    expect(store.getState().machine.bus.config).toBe(2);
  });

  test('an untouched example follows the language of the interface', () => {
    const store = newStore('es');
    store.dispatch(loadExample('07-impresora-pio'));
    store.dispatch(setSettings({ lang: 'en' }));
    expect(store.getState().editor.text).toMatch(/ARCHITECTURE/);
    expect(store.getState().editor.filepath).toBe('07-printer-pio.asm');
    store.dispatch(setSettings({ lang: 'es' }));
    expect(store.getState().editor.text).toMatch(/ARQUITECTURA/);
  });

  test('a program that was edited stays as it is when the language changes', () => {
    const store = newStore('es');
    store.dispatch(loadExample('07-impresora-pio'));
    const edited = `${EXAMPLES[6].versions.es.source}; mine\n`;
    store.dispatch(changeText(edited));
    store.dispatch(setSettings({ lang: 'en' }));
    expect(store.getState().editor.text).toBe(edited);
  });

  test('an example saved in the other language is translated at startup', () => {
    const spanish = newStore('es');
    persistProgram(spanish);
    spanish.dispatch(loadExample('02-subrutina'));
    const english = newStore('en');
    english.dispatch(loadInitialProgram());
    expect(english.getState().editor.filepath).toBe('02-subroutine.asm');
  });
});
