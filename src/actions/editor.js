import fs from 'fs';

export const DEFAULT_FILE_NAME = 'newfile.asm'

export const CHANGE_TEXT = 'CHANGE_TEXT';
export const CHANGE_FILE_PATH = 'CHANGE_FILE_PATH';

export const changeText = text => ({
  type: CHANGE_TEXT,
  text
})

export const setTitle = (title) => {
  document.title = `${title} - SIM88`
}

export const changeFilePath = (filepath) => {
  setTitle(filepath);
  return {
    type: CHANGE_FILE_PATH,
    filepath
  }
}

export const newFile = () => (dispatch) => {
  dispatch(changeText(''));
  dispatch(changeFilePath(undefined));
}

export const readFile = (path) => (dispatch) => {
  fs.readFile(path, 'utf8', (err, data) => {
    dispatch(changeFilePath(path));
    dispatch(changeText(data));
  });
}

export const writeFile = (filepath, text) => () => {
  fs.writeFile(filepath, text, () => { });
}

export const writeNewFile = (filepath, text) => (dispatch) => {
  dispatch(changeFilePath(filepath));
  dispatch(writeFile(filepath, text));
}

