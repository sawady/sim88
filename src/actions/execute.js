import parser from '../grammar'
import { setInterval, clearTimeout } from 'timers';

let t;

export const execute = (text, editor) => (dispatch, getState) => {
  dispatch(stop());
  const ast = parser.parse(text);
  let i = 0;
  console.log(ast);
  t = setInterval(
    () => {
      if (i < ast.length) {
        console.log('execute', ast[i]);
        dispatch({
          type: 'EXECUTE',
          line: i + 1,
          ast: ast[i],
        });
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
