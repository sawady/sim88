
const defaultText = 
`MOV AX, 1000h
END`

export default (state = { text: defaultText }, action) => {
  switch (action.type) {
    case 'CHANGE_TEXT':
      return {
        ...state,
        text: action.text,
      }
    default:
      return state
  }
};
