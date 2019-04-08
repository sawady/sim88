import parser from '../grammar'
import { setInterval, clearTimeout } from 'timers';

let t;

const changeEditor = (line, instruction) => ({
  type: 'EXECUTE',
  line: line,
  ast: instruction,
})

const executeInstruction = (instruction) => ({
  type: `I-${instruction.type.toUpperCase()}`,
  instruction: instruction,
})

export const execute = (text, editor) => (dispatch, getState) => {
  dispatch(stop());
  const ast = parser.parse(text);
  let i = 0;
  t = setInterval(
    () => {
      if (i < ast.length) {
        dispatch(changeEditor(i + 1, ast[i]));
        dispatch(executeInstruction(ast[i]));
        i++;
      } else {
        clearTimeout(t)
      }
    },
    1000
  );
};

export const stop = () => {
  clearTimeout(t);
  return {
    type: 'STOP'
  };
};
