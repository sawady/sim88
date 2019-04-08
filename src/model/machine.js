import Cell from './cell'
import { toLowReg, toHighReg, fromReg } from './conversions'

import update from 'immutability-helper';

const MEMORY_SIZE = 200
const DEFAULT_IP = 150
const DEFAULT_SP = MEMORY_SIZE + 1
const REGISTERS = ['AX', 'BX', 'CX', 'DX']
const LOW_REGISTERS = REGISTERS.map(x => x[0] + 'L');
const HIGH_REGISTERS = REGISTERS.map(x => x[0] + 'H');
const ALU_REGISTERS = ['OP1', 'OP2', 'RES']
const FLAGS = ['i', 'z', 's', 'o', 'c', 'a', 'p']

const createReg = (name, value) => ({ type: 'REG', name, value });
const createFlag = (name, value) => ({ type: 'FLAG', name, value });
const addReg = (res, reg) => {
  res[reg] = createReg(reg, 10);
  return res;
}

export const renderRegister = (x) => fromReg(x.name, x.value);

const updateValue = (value) => ({ value: { $set: value } });

const getFullReg = (reg) => reg[0] + 'X';

const updateRegister = (reg, prev, value) => {
  if (REGISTERS.includes(reg)) {
    return updateValue(value);
  }
  if (LOW_REGISTERS.includes(reg)) {
    return updateValue(toLowReg(prev, value));
  }
  if (HIGH_REGISTERS.includes(reg)) {
    return updateValue(toHighReg(prev, value));
  }
  return updateValue(0);
}

export const moveToRegister = (machine, name, data) => {
  const reg = getFullReg(name);
  const prev = machine.registers[reg].value;
  return update(machine, {
    activeComponent: { $set: reg },
    decoder: { $set: 'MOV' },
    registers: {
      [reg]: updateRegister(name, prev, data.value),
    },
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
    decoder: { $set: '????' },
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