import Cell from './cell'
import { fromReg, readHex } from './conversions'
import _find from 'lodash/find';
import interpreter from './interpreter';

import update from 'immutability-helper';
import {
  INITIAL_VELOCITY,
  MIN_VELOCITY,
  MAX_VELOCITY,
  MEMORY_SIZE,
  DEFAULT_IR,
  DEFAULT_IP,
  DEFAULT_SP,
  REGISTERS,
  ALU_REGISTERS,
  FLAGS,
  MACHINE_STATES,
  INSTRUCTION_CYCLE_STATES,
  DEFAULT_DECODER_VALUE,
} from './constants';

const createReg = (name, value) => ({ type: 'REG', name, value });
const createFlag = (name, value) => ({ type: 'FLAG', name, value });
const addReg = (res, reg) => {
  res[reg] = createReg(reg, 10);
  return res;
}

export const renderRegister = (x) => fromReg(x.name, x.value);

export const fetchInstruction = (machine) => {
  return update(machine, {
    IR: {
      $set: createReg('IR',
        _find(machine.memory, { dir: machine.IP.value }).value
      )
    },
    decoder: { $set: DEFAULT_DECODER_VALUE },
    activeComponents: { $set: ['IR'] },
  });
}

export const fetchOperand = (machine) => {
  return incrementIP(update(machine, {
    activeComponents: { $set: [] },
  }));
}

export const decode = (machine) => {
  return incrementIP(update(machine, {
    activeComponents: { $set: ['decoder'] },
    decoder: { $set: 'MOV' },
  }));
}

export const execute = (machine) => {
  return machine;
}

export const doStep = (machine) => {
  console.log('step', machine.instructionCycleState);
  switch (machine.instructionCycleState) {
    case INSTRUCTION_CYCLE_STATES.FETCHING_INSTRUCTION:
      return fetchInstruction(machine);
    case INSTRUCTION_CYCLE_STATES.FETCHING_OPERAND_1:
    case INSTRUCTION_CYCLE_STATES.FETCHING_OPERAND_2:
      return fetchOperand(machine);
    case INSTRUCTION_CYCLE_STATES.DECODING:
      return decode(machine);
    case INSTRUCTION_CYCLE_STATES.EXECUTING:
      return execute(machine);
    default:
      return machine;
  }
}

export const nextCycleState = (machine) => {
  const states = INSTRUCTION_CYCLE_STATES;
  const next = {
    [states.FETCHING_INSTRUCTION]: states.DECODING,
    [states.DECODING]: states.FETCHING_OPERAND_1,
    [states.FETCHING_OPERAND_1]:
      machine.currentInstruction && machine.currentInstruction.operands === 2 ?
        states.FETCHING_OPERAND_2 :
        states.EXECUTING,
    [states.EXECUTING]: states.FETCHING_INSTRUCTION,
  }[machine.instructionCycleState] || states.STOPPED;
  return update(machine, {
    instructionCycleState: { $set: next },
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
  return memory.map(cell => cell.setFromHexValue(program[cell.dir] || 0));
}

export const incrementIP = (machine) => {
  return addIP(1, machine);
}

export const addIP = (value, machine) => {
  return update(machine, {
    IP: { $apply: (reg) => createReg('IP', reg.value + value) },
  });
}

export const updateIP = (value, machine) => {
  return update(machine, {
    IP: { $set: createReg('IP', value) }
  });
}

export const start = (machine) => {
  return update(machine, {
    IP: { $set: createReg('IP', DEFAULT_IP) },
    state: { $set: MACHINE_STATES.RUNNING },
    instructionCycleState: { $set: INSTRUCTION_CYCLE_STATES.FETCHING_INSTRUCTION },
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
    instructionCycleState: { $set: INSTRUCTION_CYCLE_STATES.STOPPED },
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
  });
}

export const createMachine = () => ({
  registers: REGISTERS.reduce(addReg, {}),
  ALU: ALU_REGISTERS.reduce(addReg, {}),
  flags: FLAGS.map(x => createFlag(x, false)),
  IR: createReg('IR', DEFAULT_IR),
  IP: createReg('IP', DEFAULT_IP),
  SP: createReg('SP', DEFAULT_SP),
  currentInstruction: null,
  decoder: DEFAULT_DECODER_VALUE,
  memory: generateMemory(MEMORY_SIZE),
  state: MACHINE_STATES.STOPPED,
  instructionCycleState: INSTRUCTION_CYCLE_STATES.STOPPED,
  activeComponents: [],
  velocity: INITIAL_VELOCITY,
  start,
  stop,
  pause,
  resume,
});
