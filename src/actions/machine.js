import { assemble } from '../model/assembler';
import { MACHINE_STATES } from '../model/constants';

const makeErrorMessage = (e) =>
  e.line ? `Error en la línea ${e.line}: ${e.message}` : `Error: ${e.message}`;

let TIMER;

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
export const DECREASE_VELOCITY = 'DECREASE_VELOCITY';
export const INCREASE_VELOCITY = 'INCREASE_VELOCITY';

// Runs one phase of the cycle every `velocity` ms while the machine runs.
const runLoop = () => (dispatch, getState) => {
  clearTimeout(TIMER);
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
const load = (text) => (dispatch) => {
  clearTimeout(TIMER);
  dispatch({ type: START });
  try {
    dispatch({ type: LOAD_PROGRAM, program: assemble(text) });
    return true;
  } catch (e) {
    dispatch({ type: SHOW_ERROR, message: makeErrorMessage(e), line: e.line });
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
  return { type: STOP };
};

export const resume = () => (dispatch) => {
  dispatch({ type: RESUME });
  dispatch(runLoop());
};

export const pause = () => {
  clearTimeout(TIMER);
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
  return { type: RESET };
};
