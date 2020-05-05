import { BINARY, MOV, NUMBER, REGISTER } from './constants';
import { combination } from './instruction';

export default function staticCheck(ast) {
  for (let i = 0; i < ast.length; i++) {
    checkParams(ast[i]);
  }
}

function checkParams(instruction) {
  switch (instruction.group) {
    case BINARY:
      checkParamsBinary(instruction);
      break;
    default:
      break;
  }
}

const validParams = {
  [MOV]: {
    [`${REGISTER}-${NUMBER}`]: true,
    [`${REGISTER}-${REGISTER}`]: true,
  }
}

function checkParamsBinary(instruction) {
  const comb = combination(instruction);
  if (!validParams[instruction.type][comb]) {
    const error = new Error(`
      Invalid params for ${instruction.type},
      you pass ${comb}
    `);
    error.line = instruction.line;
    throw error;
  }
}