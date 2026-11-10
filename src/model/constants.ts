// UI level constants. CPU constants (memory size, initial IP and SP) are in cpu.ts.

export const IR = 'IR';
export const IP = 'IP';
export const SP = 'SP';
export const DECODER = 'DECODER';

export const INITIAL_VELOCITY = 500; // ms per phase of the cycle

export const MIN_VELOCITY = 10000; // ms

export const MAX_VELOCITY = 10; // ms

export const DEFAULT_DECODER_VALUE = '????';

// Registers shown in the CPU, and the flags in the order MSX88 shows them.
export const REGISTERS = ['AX', 'BX', 'CX', 'DX'];

export const ALU_REGISTERS = ['OP1', 'OP2', 'RES'];

export const FLAGS = ['I', 'Z', 'S', 'O', 'C', 'A', 'P'];

export const MACHINE_STATES = {
  RUNNING: 'RUNNING',
  PAUSED: 'PAUSED',
  STOPPED: 'STOPPED',
} as const;

export type MachineState = (typeof MACHINE_STATES)[keyof typeof MACHINE_STATES];

// Names of the phases of the cycle (see EXECUTION_CYCLE in machine.ts)
export const PHASE_NAMES_UI = ['Captación', 'Decodificación', 'Incremento de IP', 'Operandos', 'Ejecución'];
