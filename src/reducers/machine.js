import Machine from '../model/machine';

const defaultState = new Machine();

export default (state = defaultState, action) => {
  switch (action.type) {
    case 'MOV':
      return state;
    default:
      return state;
  }
};
