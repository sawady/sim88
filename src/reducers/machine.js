import {
  createMachine,
  moveToRegister,
  start,
  stop,
  pause,
  increaseVelocity,
  decreaseVelocity,
} from '../model/machine';

export default (machine = createMachine(), action) => {
  switch (action.type) {
    case 'RESUME':
    case 'START':
      return start(machine);
    case 'STOP':
      return stop(machine);
    case 'PAUSE':
      return pause(machine);
    case 'I-MOV':
      return moveToRegister(
        machine,
        action.instruction.p1.value,
        action.instruction.p2
      );
    case 'RESET':
      return createMachine();
    case 'INCREASE_VELOCITY':
      return increaseVelocity(machine);
    case 'DECREASE_VELOCITY':
      return decreaseVelocity(machine);
    default:
      return machine;
  }
};
