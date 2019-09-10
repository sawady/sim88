import Cell from './cell'
import { fromReg, readHex } from './conversions'
import { execute } from './interpreter';

import _flatten from 'lodash/flatten';
import _find from 'lodash/find';
import update from 'immutability-helper';
import {
  INITIAL_VELOCITY,
  MIN_VELOCITY,
  MAX_VELOCITY,
  MEMORY_SIZE,
  DEFAULT_IP,
  DEFAULT_SP,
  REGISTERS,
  ALU_REGISTERS,
  FLAGS,
  MACHINE_STATES,
} from './constants';

const createReg = (name, value) => ({ type: 'REG', name, value });
const createFlag = (name, value) => ({ type: 'FLAG', name, value });
const addReg = (res, reg) => {
  res[reg] = createReg(reg, 10);
  return res;
}

export const renderRegister = (x) => fromReg(x.name, x.value);

export const executeInstruction = (machine, instruction) => {
  return execute(machine, instruction);
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
    activeComponents: { $set: [] },
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
  activeComponents: [],
  velocity: INITIAL_VELOCITY,
  compiledProgram: [],
  start,
  stop,
  pause,
  resume,
});
