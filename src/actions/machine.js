import parser from '../grammar'
import { startExecutionCycle } from '../model/machine';
import { MACHINE_STATES } from '../model/constants';
import { readHex } from '../model/conversions';
import staticCheck from '../model/static-checker';
import compile from '../model/compiler';

const makeErrorMessage = (e) =>
  e.name === 'SyntaxError' ?
    `${e.name} on line ${e.location.start.line}: ${e.message}` :
    `Error on line ${e.line}. ${e.message}`

let TIMER;

const doSep = (dispatch, getState) => (f) =>
  new Promise((resolve) => {
    const current = getState().machine;
    if (current.state === MACHINE_STATES.RUNNING) {
      TIMER = setTimeout(() => {
        const updated = f(current);
        dispatch(updateMachine(updated));
        resolve();
      }, getState().machine.velocity);
    }
  });

const executeProgram = (dispatch, getState) => {
  try {
    startExecutionCycle(doSep(dispatch, getState));
  } catch (e) {
    console.log(JSON.parse(JSON.stringify(e)));
    dispatch({
      type: 'SHOW_ERROR',
      message: e,
    })
    dispatch(stop());
    throw e;
  }
}

const loadProgram = (program) => {
  return {
    type: 'LOAD_PROGRAM',
    program,
  }
}

const updateMachine = (machine) => {
  return {
    type: 'UPDATE_MACHINE',
    machine,
  }
}

export const start = (text) => (dispatch, getState) => {
  dispatch(stop());
  dispatch({ type: 'START' });
  try {
    // Produce de AST
    const ast = parser.parse(text);
    // Do static checks
    staticCheck(ast);
    console.log('ast', ast);
    // Compile AST
    const compiled = compile(readHex(2000), ast);
    console.log('compile', compiled);
    dispatch(loadProgram(compiled));
    // Execute Program
    executeProgram(dispatch, getState);
  } catch (e) {
    dispatch({
      type: 'SHOW_ERROR',
      message: makeErrorMessage(e),
    })
    throw e;
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

export const decreaseVelocity = () => changeVelocity('DECREASE_VELOCITY');

export const increaseVelocity = () => changeVelocity('INCREASE_VELOCITY');

export const reset = () => {
  clearTimeout(TIMER);
  return {
    type: 'RESET'
  };
}
