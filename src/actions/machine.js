// import parser from '../grammar';
import _compile from '../model/compiler';
import { MACHINE_STATES } from '../model/constants';
import { fromHexToInt } from '../model/conversions';
import { startExecutionCycle } from '../model/machine';
import _staticCheck from '../model/static-checker';
import { parse } from './parser';

let TIMER;

export const SHOW_ERROR = 'SHOW_ERROR';
export const LOAD_PROGRAM = 'LOAD_PROGRAM';
export const UPDATE_MACHINE = 'UPDATE_MACHINE';
export const SET_COMPILED = 'SET_COMPILED';
export const START = 'START';
export const STOP = 'STOP';
export const RESUME = 'RESUME';
export const PAUSE = 'PAUSE';
export const RESET = 'RESET';
export const DECREASE_VELOCITY = 'DECREASE_VELOCITY';
export const INCREASE_VELOCITY = 'INCREASE_VELOCITY';

const doStep = (dispatch, getState) => (step) =>
  new Promise((resolve) => {
    const current = getState().machine;
    if (current.state === MACHINE_STATES.RUNNING) {
      TIMER = setTimeout(() => {
        const updated = step(current);
        dispatch(updateMachine(updated));
        resolve();
      }, getState().machine.velocity);
    }
  });

const executeProgram = () => async (dispatch, getState) => {
  try {
    await startExecutionCycle(doStep(dispatch, getState));
  } catch (e) {
    dispatch(showError(e));
    dispatch(stop());
  }
}

const loadProgram = (program) => ({
  type: LOAD_PROGRAM,
  program,
})

const updateMachine = (machine) => ({
  type: UPDATE_MACHINE,
  machine,
})

const setCompiled = (compiled) => ({
  type: SET_COMPILED,
  compiled,
})


const compile = (dispatch, getState) => {
  const from = fromHexToInt('2000');
  const ast = getState().editor.ast;
  const compiled = _compile(ast);
  console.log('compiled', compiled);
  dispatch(setCompiled(compiled));
}

const staticCheck = async (dispatch, getState) => {
  const ast = getState().editor.ast;
  _staticCheck(ast);
}

export const start = (text) => async (dispatch, getState) => {
  dispatch(stop());
  dispatch({ type: START });
  try {
    dispatch(parse(text));
    dispatch(staticCheck());
    dispatch(compile());
    dispatch(loadProgram());
    dispatch(executeProgram());
  } catch (e) {
    dispatch(showError(e));
    dispatch(stop());
  }
};

export const stop = () => {
  clearTimeout(TIMER);
  return {
    type: STOP
  };
}

export const resume = () => (dispatch, getState) => {
  dispatch({ type: RESUME });
  executeProgram(dispatch, getState);
}

export const pause = () => {
  clearTimeout(TIMER);
  return {
    type: PAUSE
  };
}

export const showError = (message) => {
  return {
    type: SHOW_ERROR,
    message,
  };
}

const changeVelocity = (event) => (dispatch, getState) => {
  const state = getState().machine.state;
  if (state === MACHINE_STATES.RUNNING) {
    dispatch(pause());
    dispatch({ type: event });
    dispatch(resume());
  } else {
    dispatch({ type: event });
  }
}

export const decreaseVelocity = () => changeVelocity(DECREASE_VELOCITY);

export const increaseVelocity = () => changeVelocity(INCREASE_VELOCITY);

export const reset = () => {
  clearTimeout(TIMER);
  return {
    type: RESET
  };
}
