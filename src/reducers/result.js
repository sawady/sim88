import parser from '../grammar'

export default (state = { result: '' }, action) => {
  switch (action.type) {
    case 'RUN':
      try {
        const result = parser.parse(action.text);
        return {
          ...state,
          error: undefined,
          result: result,
        }
      } catch (e) {
        return {
          ...state,
          result: 'error',
          error: e.message
        }
      }
    default:
      return state
  }
};
