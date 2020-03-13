import update from 'immutability-helper';
import {
  REGISTERS,
  LOW_REGISTERS,
  HIGH_REGISTERS,
} from './constants';
import { putLowReg, putHighReg, getValueFromReg } from './conversions'
import { instructionName } from './instruction';

export const getFullRegName = (reg) => reg[0] + 'X';

const updateValue = (value) => ({ value: { $set: value } });

export const updateRegister = (reg, prev, value) => {
  if (REGISTERS.includes(reg)) {
    return updateValue(value);
  }
  if (LOW_REGISTERS.includes(reg)) {
    return updateValue(putLowReg(prev, value));
  }
  if (HIGH_REGISTERS.includes(reg)) {
    return updateValue(putHighReg(prev, value));
  }
  return updateValue(0);
}

export const moveRegisterDecimal = (machine, name, data) => {
  const reg = getFullRegName(name);
  const prev = machine.registers[reg].value;
  return update(machine, {
    activeComponents: { $set: [reg] },
    registers: {
      [reg]: updateRegister(name, prev, data.value),
    },
  });
}

export const moveRegisterRegister = (machine, param1, param2) => {
  const reg1 = getFullRegName(param1.value);
  const reg2 = getFullRegName(param2.value);
  const prev = machine.registers[reg1].value;
  const value = getValueFromReg(param2.value, machine.registers[reg2].value);
  return update(machine, {
    activeComponents: { $set: [reg1, reg2] },
    registers: {
      [reg1]: updateRegister(param1.value, prev, value),
    },
  });
}

export const execute = (machine, instruction) => {
  switch (instructionName(instruction)) {
    case 'mov-register-decimal':
      return moveRegisterDecimal(
        machine,
        instruction.p1.value,
        instruction.p2
      );
    case 'mov-register-hexadecimal':
      return moveRegisterDecimal(
        machine,
        instruction.p1.value,
        instruction.p2
      );
    case 'mov-register-register':
      return moveRegisterRegister(
        machine,
        instruction.p1,
        instruction.p2,
      );
    case 'END':
      return machine.stop(machine);
    default:
      return machine;
  }
}
