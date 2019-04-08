import { createMachine, changeRegister } from '../model/machine';

const defaultState = createMachine();

export default (machine = defaultState, action) => {
  switch (action.type) {
    case 'I-MOV':
      return changeRegister(
        machine,
        action.instruction.p1.value,
        action.instruction.p2
      );
    default:
      return machine;
  }
};
