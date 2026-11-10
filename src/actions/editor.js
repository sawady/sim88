import { EXAMPLES, DEFAULT_EXAMPLE, exampleVersion, findExampleBySource } from '../examples';
import { setConfig } from './machine';
import { storage } from '../storage';

export const DEFAULT_FILE_NAME = 'newfile.asm';

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

// Loads an example, in the language of the interface (and the MSX88
// configuration it needs).
export const loadExample = (id) => (dispatch, getState) => {
  const example = EXAMPLES.find((e) => e.id === id);
  if (!example) return;
  const { file, source } = exampleVersion(example, getState().settings.lang);
  dispatch(changeFilePath(file));
  dispatch(changeText(source));
  dispatch(setConfig(example.config));
};

// An example nobody has edited follows the language of the interface. The
// versions of an example have the same lines, so a running program keeps
// its highlighted line.
export const translateExample = () => (dispatch, getState) => {
  const { editor, settings } = getState();
  const example = findExampleBySource(editor.text);
  if (!example) return;
  const { file, source } = exampleVersion(example, settings.lang);
  if (source === editor.text) return;
  dispatch(changeFilePath(file));
  dispatch(changeText(source));
};

// At startup: the program being edited last time, or the default example.
export const loadInitialProgram = () => (dispatch) => {
  const saved = storage.get(PROGRAM_KEY);
  if (saved !== null) {
    dispatch(changeFilePath(storage.get(FILE_KEY) || DEFAULT_FILE_NAME));
    dispatch(changeText(saved));
    dispatch(translateExample());
  } else {
    dispatch(loadExample(DEFAULT_EXAMPLE.id));
  }
};

// Keeps the program in localStorage, so reloading the page does not lose it.
// Only changes are saved: the empty editor of the first render is not, so the
// first visit still gets the default example.
export function persistProgram(store) {
  let last = store.getState().editor;
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
