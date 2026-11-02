
import { DEFAULT_FILE_NAME, CHANGE_TEXT, CHANGE_FILE_PATH } from '../actions/editor';
import { START, STOP, RESET, SHOW_ERROR } from '../actions/machine';

const defaultState = {
  filepath: DEFAULT_FILE_NAME,
  text: '',
  error: undefined,
  line: undefined,
};

export default (state = defaultState, action) => {
  switch (action.type) {
    case CHANGE_TEXT:
      return {
        ...state,
        text: action.text,
      }
    case CHANGE_FILE_PATH:
      return {
        ...state,
        filepath: action.filepath,
      }
    case START:
      return {
        ...state,
        error: undefined,
      }
    case STOP:
      return {
        ...state,
        line: undefined,
      }
    case RESET:
      // Resetting the machine keeps the program being edited.
      return {
        ...defaultState,
        filepath: state.filepath,
        text: state.text,
      }
    case SHOW_ERROR:
      return {
        ...state,
        error: action.message,
      }
    default:
      return state
  }
};
