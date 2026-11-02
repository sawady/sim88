import { DEFAULT_FILE_NAME, CHANGE_TEXT, CHANGE_FILE_PATH, SET_STRICT } from '../actions/editor';
import { START, RESET, SHOW_ERROR } from '../actions/machine';

const defaultState = {
  filepath: DEFAULT_FILE_NAME,
  text: '',
  error: undefined,
  // line of the last assembler error, to move the cursor there
  errorLine: undefined,
  // MSX88 strict mode (see assembler.js)
  strict: false,
};

export default (state = defaultState, action) => {
  switch (action.type) {
    case CHANGE_TEXT:
      return { ...state, text: action.text };
    case CHANGE_FILE_PATH:
      return { ...state, filepath: action.filepath };
    case SET_STRICT:
      return { ...state, strict: action.strict };
    case START:
      return { ...state, error: undefined, errorLine: undefined };
    case RESET:
      // Resetting the machine keeps the program being edited.
      return { ...defaultState, filepath: state.filepath, text: state.text, strict: state.strict };
    case SHOW_ERROR:
      return { ...state, error: action.message, errorLine: action.line };
    default:
      return state;
  }
};
