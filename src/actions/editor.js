import { EXAMPLES, DEFAULT_EXAMPLE } from '../examples';
import { setConfig } from './machine';

export const DEFAULT_FILE_NAME = 'newfile.asm';
export const DEFAULT_PROGRAM = DEFAULT_EXAMPLE.source;

// localStorage may be missing or throw (private windows, blocked storage):
// then nothing is remembered.
const storage = {
  get(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  set(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      // not remembered
    }
  },
};

const PROGRAM_KEY = 'sim88.program';
const FILE_KEY = 'sim88.file';

export const CHANGE_TEXT = 'CHANGE_TEXT';
export const CHANGE_FILE_PATH = 'CHANGE_FILE_PATH';
export const SET_STRICT = 'SET_STRICT';

const STRICT_KEY = 'sim88.strict';

export const loadStrictPreference = () => storage.get(STRICT_KEY) === 'true';

// MSX88 strict mode: the assembler rejects SIM88's extensions.
export const setStrict = (strict) => {
  storage.set(STRICT_KEY, String(strict));
  return { type: SET_STRICT, strict };
};

export const changeText = (text) => ({
  type: CHANGE_TEXT,
  text,
});

export const setTitle = (title) => {
  document.title = `${title || DEFAULT_FILE_NAME} - SIM88`;
};

export const changeFilePath = (filepath) => {
  setTitle(filepath);
  return {
    type: CHANGE_FILE_PATH,
    filepath,
  };
};

export const newFile = () => (dispatch) => {
  dispatch(changeText(''));
  dispatch(changeFilePath(undefined));
};

// Loads an example (and the MSX88 configuration it needs).
export const loadExample = (id) => (dispatch) => {
  const example = EXAMPLES.find((e) => e.id === id);
  if (!example) return;
  dispatch(changeFilePath(example.file));
  dispatch(changeText(example.source));
  dispatch(setConfig(example.config));
};

// At startup: the program being edited last time, or the default example.
export const loadInitialProgram = () => (dispatch) => {
  const saved = storage.get(PROGRAM_KEY);
  if (saved !== null) {
    dispatch(changeFilePath(storage.get(FILE_KEY) || DEFAULT_FILE_NAME));
    dispatch(changeText(saved));
  } else {
    dispatch(loadExample(DEFAULT_EXAMPLE.id));
  }
};

// Keeps the program in localStorage, so reloading the page does not lose it.
export function persistProgram(store) {
  let last = {};
  return store.subscribe(() => {
    const { text, filepath } = store.getState().editor;
    if (text !== last.text) storage.set(PROGRAM_KEY, text);
    if (filepath !== last.filepath && filepath) storage.set(FILE_KEY, filepath);
    last = { text, filepath };
  });
}

// Reads a File chosen by the user (from an <input type="file">).
export const readFile = (file) => (dispatch) => {
  if (!file) return;
  file.text().then((data) => {
    dispatch(changeFilePath(file.name));
    dispatch(changeText(data));
  });
};

// Browsers can't write to disk: saving downloads the program as a file.
export const writeFile = (filename, text) => () => {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || DEFAULT_FILE_NAME;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export const writeNewFile = (filename, text) => (dispatch) => {
  dispatch(changeFilePath(filename));
  dispatch(writeFile(filename, text));
};
