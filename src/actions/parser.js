import fs from 'fs';
import peg from 'pegjs';
import { promisify } from 'util';
import { showError } from './machine';

export const SET_AST = 'SET_AST';
const readFileASync = promisify(fs.readFile);

const makeErrorMessage = (e) =>
  e.name === 'SyntaxError' ?
    `${e.name} on line ${e.location.start.line}: ${e.message}` :
    `Error on line ${e.line}. ${e.message}`

export const parse = (text) => async (dispatch) => {
  try {
    const data = await readFileASync('src/grammar.pegjs', 'utf8');
    const parser = peg.generate(data);
    const ast = parser.parse(text);
    dispatch(setAST(ast));
  } catch (e) {
    console.log(e);
    dispatch(showError(makeErrorMessage(e)));
  }
}

export const setAST = (ast) => ({
  type: SET_AST,
  ast
})