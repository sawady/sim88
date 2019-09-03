import {
  createMachine,
  start,
  resume,
  stop,
  pause,
  increaseVelocity,
  decreaseVelocity,
  loadProgram,
  executeInstruction,
  updateIP,
  addIP,
} from '../model/machine';

export default (machine = createMachine(), action) => {
  switch (action.type) {
    case 'START':
      return start(machine);
    case 'RESUME':
      return resume(machine);
    case 'STOP':
      return stop(machine);
    case 'PAUSE':
      return pause(machine);
    case 'LOAD_PROGRAM':
      return loadProgram(action.program, machine);
    case 'ADD_IP':
      return addIP(action.value, machine);
    case 'UPDATE_IP':
      return updateIP(action.value, machine);
    case 'EXECUTE_INSTRUCTION':
      return executeInstruction(machine, action.instruction);
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
