import { assemble } from '../model/assembler';
import { MACHINE_STATES } from '../model/constants';

// The assembler error is kept as it comes (with its line apart): the UI
// shows it in its language (see src/i18n/messages.js).

let TIMER;
// The timer's clock runs in real time while the program runs, at the
// frequency chosen in the settings (1 Hz by default).
let CLOCK;

const DEFAULT_TIMER_HZ = 1;

const stopClock = () => clearInterval(CLOCK);

export const SHOW_ERROR = 'SHOW_ERROR';
export const LOAD_PROGRAM = 'LOAD_PROGRAM';
export const STEP_PHASE = 'STEP_PHASE';
export const STEP_INSTRUCTION = 'STEP_INSTRUCTION';
export const STEP_BACK = 'STEP_BACK';
export const START = 'START';
export const STOP = 'STOP';
export const RESUME = 'RESUME';
export const PAUSE = 'PAUSE';
export const RESET = 'RESET';
export const TYPE_KEY = 'TYPE_KEY';
export const PRESS_F10 = 'PRESS_F10';
export const TIMER_PULSE = 'TIMER_PULSE';
export const TOGGLE_SWITCH = 'TOGGLE_SWITCH';
export const SET_CONFIG = 'SET_CONFIG';
export const DECREASE_VELOCITY = 'DECREASE_VELOCITY';
export const INCREASE_VELOCITY = 'INCREASE_VELOCITY';

// (Re)starts the clock of the timer: one pulse every 1/timerHz seconds.
export const restartClock = () => (dispatch, getState) => {
  stopClock();
  const hz = getState().settings?.timerHz ?? DEFAULT_TIMER_HZ;
  CLOCK = setInterval(() => {
    if (getState().machine.state === MACHINE_STATES.RUNNING) dispatch({ type: TIMER_PULSE });
    else stopClock();
  }, 1000 / hz);
};

// Runs one phase of the cycle every `velocity` ms while the machine runs.
const runLoop = () => (dispatch, getState) => {
  clearTimeout(TIMER);
  dispatch(restartClock());
  const tick = () => {
    if (getState().machine.state !== MACHINE_STATES.RUNNING) return;
    dispatch({ type: STEP_PHASE });
    if (getState().machine.state === MACHINE_STATES.RUNNING) {
      TIMER = setTimeout(tick, getState().machine.velocity);
    }
  };
  TIMER = setTimeout(tick, getState().machine.velocity);
};

// Assembles the source and loads it. Returns false on an assembler error.
const load = (text) => (dispatch, getState) => {
  clearTimeout(TIMER);
  dispatch({ type: START });
  try {
    const { strict } = getState().editor;
    dispatch({ type: LOAD_PROGRAM, program: assemble(text, { strict }) });
    return true;
  } catch (e) {
    dispatch({ type: SHOW_ERROR, message: e.message, line: e.line });
    dispatch({ type: STOP });
    return false;
  }
};

export const start = (text) => (dispatch) => {
  if (dispatch(load(text))) {
    dispatch({ type: RESUME });
    dispatch(runLoop());
  }
};

// Step buttons: when stopped, they load the program first and leave it paused.
const ensureLoaded = (text) => (dispatch, getState) => {
  const { state } = getState().machine;
  if (state === MACHINE_STATES.STOPPED) {
    if (!dispatch(load(text))) return false;
  }
  clearTimeout(TIMER);
  dispatch({ type: PAUSE });
  return true;
};

export const stepPhase = (text) => (dispatch) => {
  if (dispatch(ensureLoaded(text))) dispatch({ type: STEP_PHASE });
};

export const stepInstruction = (text) => (dispatch) => {
  if (dispatch(ensureLoaded(text))) dispatch({ type: STEP_INSTRUCTION });
};

export const stepBack = () => (dispatch) => {
  clearTimeout(TIMER);
  dispatch({ type: STEP_BACK });
};

export const stop = () => {
  clearTimeout(TIMER);
  stopClock();
  return { type: STOP };
};

export const resume = () => (dispatch) => {
  dispatch({ type: RESUME });
  dispatch(runLoop());
};

export const pause = () => {
  clearTimeout(TIMER);
  stopClock();
  return { type: PAUSE };
};

const changeVelocity = (type) => (dispatch, getState) => {
  dispatch({ type });
  if (getState().machine.state === MACHINE_STATES.RUNNING) dispatch(runLoop());
};

export const decreaseVelocity = () => changeVelocity(DECREASE_VELOCITY);

export const increaseVelocity = () => changeVelocity(INCREASE_VELOCITY);

export const reset = () => {
  clearTimeout(TIMER);
  stopClock();
  return { type: RESET };
};

// A key typed on the simulated keyboard (read by INT 6).
export const typeKey = (code) => ({ type: TYPE_KEY, code });

// F10: interrupt request on INT0 of the PIC (as in MSX88).
export const pressF10 = () => ({ type: PRESS_F10 });

// A pulse of the timer clock by hand (while paused or stepping).
export const timerPulse = () => ({ type: TIMER_PULSE });

// Switch n of the switch bar (keys 0-7 in MSX88).
export const toggleSwitch = (n) => ({ type: TOGGLE_SWITCH, n });

// MSX88 configuration (0-3): resets the machine with its peripherals.
export const setConfig = (config) => {
  clearTimeout(TIMER);
  stopClock();
  return { type: SET_CONFIG, config };
};
