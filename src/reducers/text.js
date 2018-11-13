
export default (state = { text: 'hello' }, action) => {
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