
import { CHANGE_FILE_PATH, CHANGE_TEXT, DEFAULT_FILE_NAME } from '../actions/editor';
import { RESET, SHOW_ERROR, START, STOP } from '../actions/machine';
import { SET_AST } from '../actions/parser';

const defaultState = {
  filepath: DEFAULT_FILE_NAME,
  text: '',
  error: undefined,
  ast: '',
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
    case SET_AST:
      return {
        ...state,
        ast: action.ast,
      }
    case START:
      return {
        ...state,
        error: undefined,
      }
    case STOP:
      return {
        ...state,
        ast: '',
        line: undefined,
      }
    case RESET:
      return defaultState
    case SHOW_ERROR:
      return {
        ...state,
        ast: 'error',
        error: action.message,
      }
    default:
      return state
  }
};
