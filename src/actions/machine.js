import parser from '../grammar';
import compile from '../model/compiler';
import { MACHINE_STATES } from '../model/constants';
import { fromHexToInt } from '../model/conversions';
import { startExecutionCycle } from '../model/machine';
import staticCheck from '../model/static-checker';

const makeErrorMessage = (e) =>
  e.name === 'SyntaxError' ?
    `${e.name} on line ${e.location.start.line}: ${e.message}` :
    `Error on line ${e.line}. ${e.message}`

let TIMER;

export const SHOW_ERROR = 'SHOW_ERROR';
export const LOAD_PROGRAM = 'LOAD_PROGRAM';
export const UPDATE_MACHINE = 'UPDATE_MACHINE';
export const START = 'START';
export const STOP = 'STOP';
export const RESUME = 'RESUME';
export const PAUSE = 'PAUSE';
export const RESET = 'RESET';
export const DECREASE_VELOCITY = 'DECREASE_VELOCITY';
export const INCREASE_VELOCITY = 'INCREASE_VELOCITY';

const doStep = (dispatch, getState) => (f) =>
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

const executeProgram = async (dispatch, getState) => {
  try {
    await startExecutionCycle(doStep(dispatch, getState));
  } catch (e) {
    console.log(JSON.parse(JSON.stringify(e)));
    dispatch({
      type: SHOW_ERROR,
      message: e,
    })
    dispatch(stop());
  }
}

const loadProgram = (program) => {
  return {
    type: LOAD_PROGRAM,
    program,
  }
}

const updateMachine = (machine) => {
  return {
    type: UPDATE_MACHINE,
    machine,
  }
}

export const start = (text) => (dispatch, getState) => {
  dispatch(stop());
  dispatch({ type: START });
  try {
    // Produce de AST
    const ast = parser.parse(text);
    // Do static checks
    staticCheck(ast);
    console.log('ast', ast);
    // Compile AST
    const compiled = compile(fromHexToInt('2000'), ast);
    console.log('compiled', compiled);
    dispatch(loadProgram(compiled));
    executeProgram(dispatch, getState);
  } catch (e) {
    dispatch({
      type: SHOW_ERROR,
      message: makeErrorMessage(e),
    })
  }
};

export const stop = () => {
  clearTimeout(TIMER);
  return {
    type: STOP
  };
};

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
