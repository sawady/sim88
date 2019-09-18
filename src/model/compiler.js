import { toOperand, fromBinToHex8 } from './conversions';
import { combination } from './instruction';

export default function compile(org, ast) {
  const res = {};
  let dir = { value: org };
  for (let i = 0; i < ast.length; i++) {
    try {
      compileInstruction(dir, res, ast[i]);
    } catch (e) {
      e.line = ast[i].line;
      throw e;
    }
  }
  console.log('compiled', res);
  return res;
}

function compileInstruction(dir, res, instruction) {
  switch (instruction.group) {
    case 'binary':
    case 'unary':
    case 'variable':
      return compileGeneric(dir, res, instruction);
    case 'END':
      return compileEND(dir, res, instruction);
    default:
      throw new Error('Unknown group');
  }
}

function compileGeneric(dir, res, instruction) {
  const comb = combination(instruction);
  const compileF = COMPILATION_DATA[instruction.type][comb];
  if (!compileF) {
    const error = new Error(`
      Compilation for ${instruction.type},
      is not yet implemented for ${comb} combination
    `);
    error.line = instruction.line;
    throw error;
  }
  compileF(instruction).forEach(x => {
    res[dir.value] = x;
    dir.value++;
  });
}

function compileEND(instruction) {
  return [fromBinToHex8('0')];
}

// the order is important, because it compile using it
const REGS_8_BITS = ['AL', 'CL', 'DL', 'BL', 'AH', 'CH', 'DH', 'BH'];
const REGS_16_BITS = ['AX', 'CX', 'DX', 'BX', 'SP'];

function compileReg(reg) {
  const i = REGS_8_BITS.indexOf(reg);
  if (i !== -1) {
    return i.toString(2).padStart(3, '0');
  }
  return REGS_16_BITS.indexOf(reg).toString(2).padStart(3, '0');
}

function opSize(reg) {
  return REGS_8_BITS.includes(reg) ? '0' : '1';
}

const COMPILATION_DATA = {
  'mov': {
    'register-decimal': movRegDat,
    'register-hexadecimal': movRegDat,
    'register-register': movRegReg,
  },
  'variable': {
    'variable-DB': defVar,
  }
}

function defVar(inst) {
  const val = toOperand(inst.value.value);
  return [val.H];
}

function movRegDat(inst) {
  const val = toOperand(inst.p2.value);
  const opS = opSize(inst.p1.value);
  const regType = compileReg(inst.p1.value);
  const type = fromBinToHex8('1011' + opS + regType, 2);
  const operands = opS === '0' ?
    [val.H] :
    [val.H, val.L];
  return [type].concat(operands);
}

function movRegReg(inst) {
  const opS = opSize(inst.p1.value);
  const regType1 = compileReg(inst.p1.value);
  const regType2 = compileReg(inst.p2.value);
  const type = fromBinToHex8('1000101' + opS, 2);
  const operands = [fromBinToHex8('11' + regType1 + regType2, 2)];
  return [type].concat(operands);
}
