
import { DEFAULT_FILE_NAME } from '../actions/editor'

const defaultText = 
`MOV AX, 1000h
END`

const defaultState = {
  filepath: DEFAULT_FILE_NAME,
  text: defaultText
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
    default:
      return state
  }
};
