import parser from '../grammar'
import { setInterval, clearTimeout } from 'timers';

let t;

const changeLine = (line, instruction) => ({
  type: 'CHANGE_LINE',
  line: line,
  ast: instruction,
})

const executeInstruction = (instruction) => ({
  type: `I-${instruction.type.toUpperCase()}`,
  instruction,
})

const execute = (dispatch, getState, text) => {
  const ast = parser.parse(text);
  let i = getState().editor.line || 0;
  t = setInterval(
    () => {
      if (i < ast.length) {
        dispatch(changeLine(i + 1, ast[i]));
        dispatch(executeInstruction(ast[i]));
        i++;
      } else {
        dispatch(changeLine(i + 1));
        dispatch(stop());
      }
    },
    1000
  );
}

export const start = (text) => (dispatch, getState) => {
  dispatch(stop());
  dispatch({
    type: 'START',
  });
  execute(dispatch, getState, text);
};

export const stop = () => {
  clearTimeout(t);
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
  clearTimeout(t);
  return {
    type: 'PAUSE'
  };
}

export const reset = () => {
  clearTimeout(t);
  return {
    type: 'RESET'
  };
}
