import { toOperand, fromBinToHex8 } from './conversions';

export default function compile(ast) {
  const res = [];
  for (let i = 0; i < ast.length; i++) {
    res.push([compileInstruction(ast[i])]);
  }
  return res;
}

function compileInstruction(instruction) {
  switch (instruction.group) {
    case 'binary':
      return compileBinary(instruction);
    default:
      throw new Error('Unknown group');
  }
}

function compileBinary(instruction) {
  const p1Type = instruction.p1.type;
  const p2Type = instruction.p2.type;
  const combination = `${p1Type}-${p2Type}`;
  return COMPILATION_DATA[instruction.type][combination](instruction);
}

// the order is important, because we compile using it
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
    'register-decimal': movRegDatDec
  },
}

function movRegDatDec(inst) {
  const val = toOperand(inst.p2.value);
  const opS = opSize(inst.p1.value);
  const regType = compileReg(inst.p1.value);
  const type = fromBinToHex8('1011' + opS + regType, 2);
  const operands = opS === '0' ?
    [ val.H ] :
    [ val.H, val.L ];
  return [type].concat(operands);
}