
import { DEFAULT_FILE_NAME } from '../actions/editor'

const defaultText =
  `
  hola DB 0FFH

  MOV AX, 77FFH
  MOV BX, AX
  MOV CL, AL
  MOV DH, AH
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
    case 'START':
      return {
        ...state,
        error: undefined,
      }
    case 'STOP':
      return {
        ...state,
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
      return {
        ...state,
        error: undefined,
        ast: action.ast,
        line: action.line,
      }
    case 'SHOW_ERROR':
      return {
        ...state,
        ast: 'error',
        error: action.message,
      }
    default:
      return state
  }
};
