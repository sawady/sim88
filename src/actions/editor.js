import defaultProgram from '../examples/default.asm?raw';

export const DEFAULT_FILE_NAME = 'newfile.asm';
export const DEFAULT_PROGRAM = defaultProgram;

export const CHANGE_TEXT = 'CHANGE_TEXT';
export const CHANGE_FILE_PATH = 'CHANGE_FILE_PATH';

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
