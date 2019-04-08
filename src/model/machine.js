import Cell from './cell'
import { toReg, fromReg } from './conversions'

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

export const renderRegister = (x) => fromReg(x.name, x.value);

const changeValue = (data) => ({ value: { $set: toReg(data.type, data.value) } })

export const changeRegister = (machine, reg, data) => {
  return update(machine, {
    registers: {
      [reg]: changeValue(data)
    }
  });
}

const generateMemory = (size) => {
  const memory = [];
  for (let i = 0; i <= size; i++) {
    memory.push(new Cell(i, 0));
  }
  return memory;
}

export const start = (machine) => {
  return update(machine, {
    state: { $set: 'RUNNING' },
  });
}

export const pause = (machine) => {
  return update(machine, {
    state: { $set: 'PAUSED' },
  });
}

export const stop = (machine) => {
  return update(machine, {
    state: { $set: 'STOPPED' },
    activeComponent: { $set: null },
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
  memory: generateMemory(MEMORY_SIZE),
  state: 'STOPPED',
  activeComponent: null,
});