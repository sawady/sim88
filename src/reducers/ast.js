import parser from '../grammar'

export default (state = { ast: '' }, action) => {
  switch (action.type) {
    case 'EXECUTE':
      try {
        const ast = parser.parse(action.text);
        return {
          ...state,
          error: undefined,
          ast: ast,
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
