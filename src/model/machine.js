import Cell from './cell'
import { toLowReg, toHighReg, fromReg, readHex } from './conversions'

import _flatten from 'lodash/flatten';
import _find from 'lodash/find';
import update from 'immutability-helper';

const INITIAL_VELOCITY = 800; // ms
const MIN_VELOCITY = 10000; // ms
const MAX_VELOCITY = 10; // ms
const MEMORY_SIZE = 1000 // 8000
const DEFAULT_IP = readHex(2000);
const DEFAULT_SP = MEMORY_SIZE + 1;
const REGISTERS = ['AX', 'BX', 'CX', 'DX'];
const LOW_REGISTERS = REGISTERS.map(x => x[0] + 'L');
const HIGH_REGISTERS = REGISTERS.map(x => x[0] + 'H');
const ALU_REGISTERS = ['OP1', 'OP2', 'RES'];
const FLAGS = ['i', 'z', 's', 'o', 'c', 'a', 'p'];
export const MACHINE_STATES = {
  RUNNING: 'RUNNING',
  PAUSED: 'PAUSED',
  STOPPED: 'STOPPED',
};

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
    memory.push(new Cell(readHex(2000) + i, 0));
  }
  return memory;
}

const loadProgramInMemory = (program) => (memory) => {
  const flattened = _flatten(program.map(x => x.compiled));
  return memory.map((cell, i) => cell.setFromHexValue(flattened[i] || 0));
}

export const addIP = (value, machine) => {
  return update(machine, {
    IP: { $apply: (reg) => createReg('IP', reg.value + value) },
  })
}

export const updateIP = (value, machine) => {
  return update(machine, {
    IP: { $set: createReg('IP', value) }
  })
}

export const start = (machine) => {
  return update(machine, {
    IP: { $set: createReg('IP', DEFAULT_IP) },
    state: { $set: MACHINE_STATES.RUNNING },
  });
}

export const resume = (machine) => {
  return update(machine, {
    state: { $set: MACHINE_STATES.RUNNING },
  });
}

export const pause = (machine) => {
  return update(machine, {
    state: { $set: MACHINE_STATES.PAUSED },
  });
}

export const stop = (machine) => {
  return update(machine, {
    state: { $set: MACHINE_STATES.STOPPED },
    activeComponent: { $set: null },
    decoder: { $set: '????' },
  });
}

export const decreaseVelocity = (machine) => {
  return update(machine, {
    velocity: { $set: Math.round(Math.min(MIN_VELOCITY, machine.velocity * 1.5)) },
  });
}

export const increaseVelocity = (machine) => {
  return update(machine, {
    velocity: { $set: Math.round(Math.max(MAX_VELOCITY, machine.velocity * 0.5)) },
  });
}

export const loadProgram = (program, machine) => {
  return update(machine, {
    memory: { $apply: loadProgramInMemory(program) },
    compiledProgram: { $set: program },
  })
}

export const findCompiledInstruction = (line, program) =>
  _find(program, x => line === x.line)

export const createMachine = () => ({
  registers: REGISTERS.reduce(addReg, {}),
  ALU: ALU_REGISTERS.reduce(addReg, {}),
  flags: FLAGS.map(x => createFlag(x, false)),
  IR: '00',
  IP: createReg('IP', DEFAULT_IP),
  SP: createReg('SP', DEFAULT_SP),
  decoder: '????',
  memory: generateMemory(MEMORY_SIZE),
  state: MACHINE_STATES.STOPPED,
  activeComponent: null,
  velocity: INITIAL_VELOCITY,
  compiledProgram: [],
});
