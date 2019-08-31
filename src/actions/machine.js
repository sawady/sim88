import parser from '../grammar'
import { setInterval, clearTimeout } from 'timers';
import { MACHINE_STATES } from '../model/machine';
import staticCheck from '../model/static-checker';
import compile from '../model/compiler';

let TIMER;

const changeLine = (line, instruction) => ({
  type: 'CHANGE_LINE',
  line: line,
  ast: instruction,
})

const makeErrorMessage = (e) =>
  e.name === 'SyntaxError' ?
    `${e.name} on line ${e.location.start.line}: ${e.message}` :
    `Error on line ${e.line}. ${e.message}`

const executeInstruction = (instruction) => ({
  type: `I-${instruction.type.toUpperCase()}`,
  instruction,
})

const execute = (dispatch, getState, text) => {
  let i = 0;
  try {
    const ast = parser.parse(text);
    staticCheck(ast);
    console.log('compile', compile(ast));
    TIMER = setInterval(
      () => {
        if (i < ast.length) {
          const inst = ast[i];
          dispatch(changeLine(inst.line, inst));
          dispatch(executeInstruction(inst));
          i++;
        } else {
          dispatch(stop());
        }
      },
      getState().machine.velocity
    );
  } catch (e) {
    console.log(JSON.parse(JSON.stringify(e)));
    dispatch({
      type: 'SHOW_ERROR',
      message: makeErrorMessage(e),
    })
    dispatch(stop());
  }
}

export const start = (text) => (dispatch, getState) => {
  dispatch(stop());
  dispatch({
    type: 'START',
  });
  execute(dispatch, getState, text);
};

export const stop = () => {
  clearTimeout(TIMER);
  return {
    type: 'STOP'
  };
};

export const resume = () => (dispatch, getState) => {
  execute(dispatch, getState, getState().editor.text);
  dispatch({
    type: 'RESUME'
  });
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
  const action = {
    type: 'INCREASE_VELOCITY'
  };
  const state = getState().machine.state;
  if (state === MACHINE_STATES.RUNNING) {
    dispatch(pause());
    dispatch(action);
    dispatch(resume());
  } else {
    dispatch(action);
  }
}

export const reset = () => {
  clearTimeout(TIMER);
  return {
    type: 'RESET'
  };
}
