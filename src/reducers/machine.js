import {
  DECREASE_VELOCITY,
  INCREASE_VELOCITY,
  LOAD_PROGRAM,
  PAUSE,
  RESET,
  RESUME,
  STEP_BACK,
  STEP_INSTRUCTION,
  STEP_PHASE,
  STOP,
  TYPE_KEY,
} from '../actions/machine';
import {
  createMachine,
  decreaseVelocity,
  increaseVelocity,
  loadProgram,
  pause,
  resume,
  stepBack,
  stepInstruction,
  stepPhase,
  stop,
  typeKey,
} from '../model/machine';
import { MACHINE_STATES } from '../model/constants';

// Stepping by hand keeps the machine paused, unless the program ended.
const manual = (machine, f) => {
  const next = f({ ...machine, state: MACHINE_STATES.RUNNING });
  return next.state === MACHINE_STATES.RUNNING ? { ...next, state: MACHINE_STATES.PAUSED } : next;
};

export default (machine = createMachine(), action) => {
  switch (action.type) {
    case RESUME:
      return resume(machine);
    case STOP:
      return stop(machine);
    case PAUSE:
      return pause(machine);
    case LOAD_PROGRAM:
      return loadProgram(machine, action.program);
    case STEP_PHASE:
      return machine.state === MACHINE_STATES.RUNNING ? stepPhase(machine) : manual(machine, stepPhase);
    case STEP_INSTRUCTION:
      return manual(machine, stepInstruction);
    case STEP_BACK:
      return machine.program ? stepBack(machine) : machine;
    case TYPE_KEY:
      return machine.state === MACHINE_STATES.STOPPED ? machine : typeKey(machine, action.code);
    case RESET:
      return { ...createMachine(), velocity: machine.velocity };
    case INCREASE_VELOCITY:
      return increaseVelocity(machine);
    case DECREASE_VELOCITY:
      return decreaseVelocity(machine);
    default:
      return machine;
  }
};
