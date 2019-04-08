import Memory from './memory';
import { toReg } from './conversions'

import update from 'immutability-helper';
import _find from 'lodash/find';

const MEMORY_SIZE = 200
const DEFAULT_IP = 150
const DEFAULT_SP = MEMORY_SIZE + 1
const REGISTERS = ['AX', 'BX', 'CX', 'DX']
const ALU_REGISTERS = ['OP1', 'OP2', 'RES']
const FLAGS = ['i', 'z', 's', 'o', 'c', 'a', 'p']

const createReg = (name, value) => ({ type: 'REG', name, value });
const createFlag = (name, value) => ({ type: 'FLAG', name, value });
const addReg = (res, reg) => {
  res[reg] = createReg(reg, 10);
  return res;
}

export const renderRegister = (x) => toReg(x.name, x.value);

const changeValue = (value) => ({ value: { $set: value } })

export const changeRegister = (machine, reg, value) => {
  return update(machine, {
    registers: {
      [reg]: changeValue(value)
    }
  });
}

export const createMachine = () => ({
  registers: REGISTERS.reduce(addReg, {}),
  ALU: ALU_REGISTERS.reduce(addReg, {}),
  flags: FLAGS.map(x => createFlag(x, false)),
  IR: '00',
  IP: createReg('IP', DEFAULT_IP),
  SP: createReg('SP', DEFAULT_SP),
  decoder: '????',
  memory: new Memory(MEMORY_SIZE),
});