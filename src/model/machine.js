import Cell from './cell'
import { fromHexToInt } from './conversions'

import _find from 'lodash/find'

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
  DEFAULT_DECODER_VALUE,
  IR,
  IP,
  SP,
  DECODER,
  REG,
  FLAG,
  ERROR,
} from './constants'
import { decode, addOperands } from './decoder'
import { execute } from './interpreter'

const createReg = (name, value) => ({ type: REG, name, value });

const createFlag = (name, value) => ({ type: FLAG, name, value });

const addReg = (res, reg) => {
  res[reg] = createReg(reg, 10);
  return res;
}

const generateMemory = (size) => {
  const memory = [];
  for (let i = 0; i <= size; i++) {
    memory.push(new Cell(fromHexToInt('2000') + i, 0));
  }
  return memory;
}

const currentCell = (machine) => _find(machine.memory, { dir: machine.IP.value });

const fetchInstruction = (machine) => ({
  IR: {
    $set: createReg(IR, currentCell(machine).value)
  },
  decoder: { $set: DEFAULT_DECODER_VALUE },
  activeComponents: { $set: [IR] },
})

const executeInstruction = (machine) => {
  const instruction = machine.currentInstruction;
  console.log('currentInstruction', instruction);
  if (instruction.type === ERROR) {
    return error();
  }
  return execute(machine, instruction);
}

export const incrementIP = () => ({
  IP: { $apply: (reg) => createReg(IP, reg.value + 1) },
  activeComponents: { $set: [IP] },
})

const decodeInstruction = (machine) => {
  const decoded = decode(machine.IR.value);
  return {
    activeComponents: { $set: [DECODER] },
    currentInstruction: { $set: decoded },
    decoder: { $set: decoded.type },
  };
}

const fetchOperands = (machine) => addOperands(machine.IP.value, machine.memory, machine.currentInstruction)

const sequence = async (doStep, steps) => {
  for (const step of steps) {
    await doStep(step);
  }
}

export const startExecutionCycle = async (doStep) => {
  while (true) {
    await sequence(doStep, [
      fetchInstruction,
      decodeInstruction,
      incrementIP,
      fetchOperands,
      executeInstruction,
      incrementIP,
    ]);
  }
}

export const start = () => ({
  IP: { $set: createReg(IP, DEFAULT_IP) },
  state: { $set: MACHINE_STATES.RUNNING },
  decoder: { $set: DEFAULT_DECODER_VALUE },
})

export const resume = () => ({
  state: { $set: MACHINE_STATES.RUNNING },
})

export const pause = () => ({
  state: { $set: MACHINE_STATES.PAUSED },
})

export const error = () => ({
  state: { $set: MACHINE_STATES.STOPPED },
  activeComponents: { $set: [] },
})

export const stop = () => ({
  state: { $set: MACHINE_STATES.STOPPED },
  activeComponents: { $set: [] },
  decoder: { $set: DEFAULT_DECODER_VALUE },
})

export const decreaseVelocity = (machine) => ({
  velocity: { $set: Math.round(Math.min(MIN_VELOCITY, machine.velocity * 1.5)) },
})

export const increaseVelocity = (machine) => ({
  velocity: { $set: Math.round(Math.max(MAX_VELOCITY, machine.velocity * 0.5)) },
})

const loadProgramInMemory = (program) => (memory) =>
  memory.map(cell => cell.setFromHexValue(program[cell.dir] || 0))

export const loadProgram = (program) => () => ({
  memory: { $apply: loadProgramInMemory(program) },
})

export const createMachine = () => ({
  registers: REGISTERS.reduce(addReg, {}),
  ALU: ALU_REGISTERS.reduce(addReg, {}),
  flags: FLAGS.map(x => createFlag(x, false)),
  IR: createReg(IR, DEFAULT_IR),
  IP: createReg(IP, DEFAULT_IP),
  SP: createReg(SP, DEFAULT_SP),
  currentInstruction: null,
  decoder: DEFAULT_DECODER_VALUE,
  memory: generateMemory(MEMORY_SIZE),
  state: MACHINE_STATES.STOPPED,
  activeComponents: [],
  velocity: INITIAL_VELOCITY,
})
