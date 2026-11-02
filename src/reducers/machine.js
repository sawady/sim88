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
  PRESS_F10,
  TIMER_PULSE,
  TOGGLE_SWITCH,
  SET_CONFIG,
} from '../actions/machine';
import { SET_PRINT_INTERVAL } from '../actions/settings';
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
  pressF10,
  timerPulse,
  toggleSwitch,
  setPrintInterval,
} from '../model/machine';
import { MACHINE_STATES } from '../model/constants';

// Stepping by hand keeps the machine paused, unless the program ended.
const manual = (machine, f) => {
  const next = f({ ...machine, state: MACHINE_STATES.RUNNING });
  return next.state === MACHINE_STATES.RUNNING ? { ...next, state: MACHINE_STATES.PAUSED } : next;
};

// A new machine for `config` that keeps the speed of the simulation and of the printer.
const fresh = (machine, config) => {
  const next = { ...createMachine({ config }), velocity: machine.velocity };
  const interval = machine.devices.printer?.interval;
  return interval ? setPrintInterval(next, interval) : next;
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
    case PRESS_F10:
      return pressF10(machine);
    case TIMER_PULSE:
      return timerPulse(machine);
    case TOGGLE_SWITCH:
      return toggleSwitch(machine, action.n);
    case SET_CONFIG:
      return fresh(machine, action.config);
    case RESET:
      return fresh(machine, machine.bus.config);
    case SET_PRINT_INTERVAL:
      return setPrintInterval(machine, action.interval);
    case INCREASE_VELOCITY:
      return increaseVelocity(machine);
    case DECREASE_VELOCITY:
      return decreaseVelocity(machine);
    default:
      return machine;
  }
};
