import parser from '../grammar'
import { startExecutionCycle } from '../model/machine';
import { MACHINE_STATES } from '../model/constants';
import { readHex } from '../model/conversions';
import staticCheck from '../model/static-checker';
import compile from '../model/compiler';

let TIMER;

const makeErrorMessage = (e) =>
  e.name === 'SyntaxError' ?
    `${e.name} on line ${e.location.start.line}: ${e.message}` :
    `Error on line ${e.line}. ${e.message}`

const executeProgram = (dispatch, getState) => {
  try {
    startExecutionCycle(dispatch, getState);
  } catch (e) {
    console.log(JSON.parse(JSON.stringify(e)));
    dispatch({
      type: 'SHOW_ERROR',
      message: makeErrorMessage(e),
    })
    dispatch(stop());
    throw e;
  }
}

export const start = (text) => (dispatch, getState) => {
  dispatch(stop());
  dispatch({ type: 'START' });
  try {
    const ast = parser.parse(text);
    staticCheck(ast);
    console.log('ast', ast);
    const compiled = compile(readHex(2000), ast);
    dispatch(loadProgram(compiled));
    executeProgram(dispatch, getState);
  } catch (e) {
    dispatch({
      type: 'SHOW_ERROR',
      message: makeErrorMessage(e),
    })
  }
};

export const stop = () => {
  clearTimeout(TIMER);
  return {
    type: 'STOP'
  };
};

export const resume = () => (dispatch, getState) => {
  dispatch({ type: 'RESUME' });
  executeProgram(dispatch, getState);
}

export const pause = () => {
  clearTimeout(TIMER);
  return {
    type: 'PAUSE'
  };
}

export const decreaseVelocity = () => (dispatch, getState) => {
  dispatch(pause());
  dispatch({
    type: 'DECREASE_VELOCITY'
  });
  dispatch(resume());
}

export const increaseVelocity = () => (dispatch, getState) => {
  const state = getState().machine.state;
  if (state === MACHINE_STATES.RUNNING) {
    dispatch(pause());
    dispatch({ type: 'INCREASE_VELOCITY' });
    dispatch(resume());
  } else {
    dispatch({ type: 'INCREASE_VELOCITY' });
  }
}

export const reset = () => {
  clearTimeout(TIMER);
  return {
    type: 'RESET'
  };
}

export const loadProgram = (program) => {
  return {
    type: 'LOAD_PROGRAM',
    program,
  }
}

export const updateIP = (value) => {
  return {
    type: 'UPDATE_IP',
    value,
  }
}