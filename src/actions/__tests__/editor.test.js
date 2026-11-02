import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { legacy_createStore as createStore, applyMiddleware, combineReducers } from 'redux';
import { thunk } from 'redux-thunk';

import reducers from '../../reducers';
import { changeText, loadExample, loadInitialProgram, persistProgram, DEFAULT_PROGRAM } from '../editor';

const newStore = () => createStore(combineReducers(reducers), applyMiddleware(thunk));

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
    expect(store.getState().editor.text).toBe(DEFAULT_PROGRAM);
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
});
