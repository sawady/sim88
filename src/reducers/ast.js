const initialState = { error: undefined, ast: '', line: undefined };

export default (state = initialState, action) => {
  switch (action.type) {
    case 'EXECUTE':
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
    case 'STOP':
      return initialState;
    default:
      return state;
  }
};
