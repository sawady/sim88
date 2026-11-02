import { combination } from './instruction';
import { MOV, REGISTER, DECIMAL, HEXADECIMAL, BINARY, END, VARIABLE } from './constants';

const REGS_8 = ['AL', 'AH', 'BL', 'BH', 'CL', 'CH', 'DL', 'DH'];
const REGS_16 = ['AX', 'BX', 'CX', 'DX'];

const fail = (instruction, message) => {
  const error = new Error(message);
  error.line = instruction.line;
  throw error;
};

const regSize = (reg) => (REGS_8.includes(reg) ? 8 : REGS_16.includes(reg) ? 16 : undefined);

export default function staticCheck(ast) {
  for (let i = 0; i < ast.length; i++) {
    checkParams(ast[i]);
  }
}

function checkParams(instruction) {
  switch (instruction.group) {
    case BINARY:
      return checkParamsBinary(instruction);
    case END:
      return undefined;
    case VARIABLE:
      if (instruction.value === '?') return undefined;
      return checkFits(instruction, instruction.value, 8, 'DB');
    default:
      return fail(instruction, `${instruction.type} is not implemented yet.`);
  }
}

const validParams = {
  [MOV]: {
    [`${REGISTER}-${DECIMAL}`]: true,
    [`${REGISTER}-${HEXADECIMAL}`]: true,
    [`${REGISTER}-${REGISTER}`]: true,
  }
};

const isImmediate = (param) => param.type === DECIMAL || param.type === HEXADECIMAL;

function checkFits(instruction, param, size, what) {
  const min = size === 8 ? -128 : -32768;
  const max = size === 8 ? 255 : 65535;
  if (param.value < min || param.value > max) {
    fail(instruction, `${param.value} does not fit in ${size} bits (${what}).`);
  }
}

function checkParamsBinary(instruction) {
  const valid = validParams[instruction.type];
  if (!valid) {
    fail(instruction, `${instruction.type} is not implemented yet.`);
  }
  const comb = combination(instruction);
  if (!valid[comb]) {
    fail(instruction, `Invalid operands for ${instruction.type} (${comb}).`);
  }
  const { p1, p2 } = instruction;
  const size1 = regSize(p1.value);
  if (p1.type === REGISTER && !size1) {
    fail(instruction, `${p1.value} is not supported yet as an operand of ${instruction.type}.`);
  }
  if (p2.type === REGISTER) {
    const size2 = regSize(p2.value);
    if (!size2) {
      fail(instruction, `${p2.value} is not supported yet as an operand of ${instruction.type}.`);
    }
    if (size1 !== size2) {
      fail(instruction, `Operand size mismatch: ${p1.value} is ${size1} bits and ${p2.value} is ${size2} bits.`);
    }
  }
  if (isImmediate(p2)) {
    checkFits(instruction, p2, size1, p1.value);
  }
}
