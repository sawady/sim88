import _find from 'lodash/find';
import { AH, AL, AX, BH, BINARY, BL, BX, CH, CL, CX, DH, DL, DX, END, ERROR, MOV, REGISTER, REGISTERS, NUMBER } from "./constants";
import { fromHexTo2CInt, printHex8 } from "./conversions";
import { incrementIP } from './machine';

const mov = (reg) => ({
  type: MOV,
  group: BINARY,
  paramSize: REGISTERS.includes(reg) ? 2 : 1,
  p1: { type: REGISTER, value: reg },
})

const INSTRUCTIONS = {
  B8: mov(AX),
  B0: mov(AL),
  B4: mov(AH),
  BB: mov(BX),
  B3: mov(BL),
  B7: mov(BH),
  B9: mov(CX),
  B1: mov(CL),
  B5: mov(CH),
  BA: mov(DX),
  B2: mov(DL),
  B6: mov(DH),
  '00': { group: END, type: END },
}

const fetchCell = (memory, dir) => _find(memory, { dir });

export function decode(irValue) {
  const hexValue = printHex8(irValue);
  return INSTRUCTIONS[hexValue] || { type: ERROR };
}

function addOperand(instruction, ...cells) {
  const op1 = printHex8(cells[0].value);
  const op2 = cells[1] ? printHex8(cells[1].value) : ''
  return {
    ...instruction,
    p2: { type: NUMBER, value: fromHexTo2CInt(op2 + op1) }
  }
}

export function addOperands(ip, memory, instruction) {
  switch (instruction.paramSize) {
    case 2:
      return {
        currentInstruction: { $set: addOperand(instruction, fetchCell(memory, ip), fetchCell(memory, ip + 1)) },
        ...incrementIP()
      };
    case 1:
      return {
        currentInstruction: { $set: addOperand(instruction, fetchCell(memory, ip)) },
      };
    default:
      return {};
  }
}