import update from 'immutability-helper'

import {
  createMachine,
  start,
  resume,
  stop,
  pause,
  increaseVelocity,
  decreaseVelocity,
  loadProgram,
} from '../model/machine';

export default (machine = createMachine(), action) => {
  const _update = (f) => update(machine, f(machine));
  switch (action.type) {
    case 'START':
      return _update(start);
    case 'RESUME':
      return _update(resume);
    case 'STOP':
      return _update(stop);
    case 'PAUSE':
      return _update(pause);
    case 'LOAD_PROGRAM':
      return _update(loadProgram(action.program));
    case 'RESET':
      return createMachine();
    case 'INCREASE_VELOCITY':
      return _update(increaseVelocity);
    case 'DECREASE_VELOCITY':
      return _update(decreaseVelocity);
    case 'UPDATE_MACHINE':
      return _update(() => action.machine);
    default:
      return machine;
  }
};
