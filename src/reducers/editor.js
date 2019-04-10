
import { DEFAULT_FILE_NAME } from '../actions/editor'

const defaultText =
`
MOV AX, 32767
MOV BX, 32768
MOV CX, -32767
MOV DX, -32768
END
`

const defaultState = {
  filepath: DEFAULT_FILE_NAME,
  text: defaultText,
  error: undefined,
  ast: '',
  line: undefined,
}

export default (state = defaultState, action) => {
  switch (action.type) {
    case 'CHANGE_TEXT':
      return {
        ...state,
        text: action.text,
      }
    case 'CHANGE_FILE_PATH':
      return {
        ...state,
        filepath: action.filepath,
      }
    case 'STOP':
      return {
        ...state,
        error: undefined,
        ast: '',
        line: undefined,
      }
    case 'RESET':
      return {
        ...state,
        text: defaultText,
        error: undefined,
        ast: '',
        line: undefined,
      }
    case 'CHANGE_LINE':
      try {
        return {
          ...state,
          error: undefined,
          ast: action.ast,
          line: action.line,
        }
      } catch (e) {
        return {
          ...state,
          ast: 'error',
          error: e.message
        }
      }
    default:
      return state
  }
};
