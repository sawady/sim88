import {
  REGISTERS,
  LOW_REGISTERS,
  HIGH_REGISTERS,
  END,
  MOV,
  REGISTER,
  HEXADECIMAL,
  DECIMAL,
} from './constants'
import { forRegLowPart, forRegHighPart, forReg } from './conversions'
import { instructionName } from './instruction'
import { stop } from './machine'

const getFullRegName = (reg) => reg[0] + 'X';

const updateValue = (value) => ({ value: { $set: value } });

const updateRegister = (reg, prev, value) => {
  if (REGISTERS.includes(reg)) {
    return updateValue(value);
  }
  if (LOW_REGISTERS.includes(reg)) {
    return updateValue(forRegLowPart(prev, value));
  }
  if (HIGH_REGISTERS.includes(reg)) {
    return updateValue(forRegHighPart(prev, value));
  }
  return updateValue(0);
}

const moveRegisterDecimal = (machine, name, data) => {
  const reg = getFullRegName(name);
  const prev = machine.registers[reg].value;
  return {
    activeComponents: { $set: [reg] },
    registers: {
      [reg]: updateRegister(name, prev, data.value),
    },
  };
}

const moveRegisterRegister = (machine, param1, param2) => {
  const reg1 = getFullRegName(param1.value);
  const reg2 = getFullRegName(param2.value);
  const prev = machine.registers[reg1].value;
  const value = forReg(param2.value, machine.registers[reg2].value);
  return {
    activeComponents: { $set: [reg1, reg2] },
    registers: {
      [reg1]: updateRegister(param1.value, prev, value),
    },
  };
}

export const execute = (machine, instruction) => {
  switch (instructionName(instruction)) {
    case `${MOV}-${REGISTER}-${DECIMAL}`:
      return moveRegisterDecimal(
        machine,
        instruction.p1.value,
        instruction.p2
      );
    case `${MOV}-${REGISTER}-${HEXADECIMAL}`:
      return moveRegisterDecimal(
        machine,
        instruction.p1.value,
        instruction.p2
      );
    case `${MOV}-${REGISTER}-${REGISTER}`:
      return moveRegisterRegister(
        machine,
        instruction.p1,
        instruction.p2,
      );
    case END:
      return stop();
    default:
      return machine;
  }
}
