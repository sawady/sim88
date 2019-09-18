import { readHex } from './conversions'

export const INITIAL_VELOCITY = 800; // ms

export const MIN_VELOCITY = 10000; // ms

export const MAX_VELOCITY = 10; // ms

export const MEMORY_SIZE = 1000 // 57343

export const DEFAULT_IR = readHex('0');

export const DEFAULT_IP = readHex('2000');

export const DEFAULT_SP = MEMORY_SIZE + 1;

export const DEFAULT_DECODER_VALUE = '????'

export const REGISTERS = ['AX', 'BX', 'CX', 'DX'];

export const LOW_REGISTERS = REGISTERS.map(x => x[0] + 'L');

export const HIGH_REGISTERS = REGISTERS.map(x => x[0] + 'H');

export const ALU_REGISTERS = ['OP1', 'OP2', 'RES'];

export const FLAGS = ['i', 'z', 's', 'o', 'c', 'a', 'p'];

export const MACHINE_STATES = {
  RUNNING: 'RUNNING',
  PAUSED: 'PAUSED',
  STOPPED: 'STOPPED',
};

export const INSTRUCTION_CYCLE_STATES = {
  STOPPED: 'STOPPED',
  FETCHING_INSTRUCTION: 'FETCHING_INSTRUCTION',
  FETCHING_OPERAND_1: 'FETCHING_OPERAND_1',
  FETCHING_OPERAND_2: 'FETCHING_OPERAND_2',
  DECODING: 'DECODING',
  EXECUTING: 'EXECUTING',
};
