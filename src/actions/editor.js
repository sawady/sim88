import defaultProgram from '../examples/default.asm?raw';

export const DEFAULT_FILE_NAME = 'newfile.asm';
export const DEFAULT_PROGRAM = defaultProgram;

export const CHANGE_TEXT = 'CHANGE_TEXT';
export const CHANGE_FILE_PATH = 'CHANGE_FILE_PATH';
export const SET_STRICT = 'SET_STRICT';

const STRICT_KEY = 'sim88.strict';

export const loadStrictPreference = () => {
  try {
    return window.localStorage.getItem(STRICT_KEY) === 'true';
  } catch (e) {
    return false;
  }
};

// MSX88 strict mode: the assembler rejects SIM88's extensions.
export const setStrict = (strict) => {
  try {
    window.localStorage.setItem(STRICT_KEY, String(strict));
  } catch (e) {
    // storage unavailable: the preference just isn't remembered
  }
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

export const loadDefaultProgram = () => (dispatch) => {
  dispatch(changeFilePath(DEFAULT_FILE_NAME));
  dispatch(changeText(DEFAULT_PROGRAM));
};

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
