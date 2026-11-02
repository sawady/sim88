// The machine as the UI sees it: the CPU plus what the fetch-decode-execute
// cycle shows at each phase (IR, decoder, ALU operands, active components).
//
// Every function takes a machine and returns a new one; nothing is mutated.
// Before each instruction the machine keeps a snapshot of itself in
// `history`, which is what stepBack() restores. Snapshots are cheap because
// memory is copied only when an instruction writes it (see cpu.js).

import { createCpu, execute, MEMORY_SIZE } from './cpu';
import { decode } from './decoder';
import { busIO, createBus } from './io';
import {
  INITIAL_VELOCITY,
  MIN_VELOCITY,
  MAX_VELOCITY,
  MACHINE_STATES,
  DEFAULT_DECODER_VALUE,
  IR,
  IP,
  DECODER,
} from './constants';

export const HISTORY_LIMIT = 1000;

const display = () => ({
  IR: 0,
  decoder: DEFAULT_DECODER_VALUE,
  instruction: null,
  pending: null,
  alu: { OP1: 0, OP2: 0, RES: 0 },
  activeComponents: [],
  activeMemory: [],
  phase: 0,
  currentLine: null,
});

// `bus` holds the devices plugged into the I/O ports (see io.js).
export const createMachine = ({ bus = createBus() } = {}) => ({
  cpu: createCpu(),
  ...display(),
  bus,
  devices: bus.initialState(),
  input: [], // keys typed and not read yet by INT 6
  waitingInput: false,
  state: MACHINE_STATES.STOPPED,
  velocity: INITIAL_VELOCITY,
  history: [],
  program: null,
  output: '',
  message: null,
  error: null,
});

// Loads an assembled program (see assembler.js) into a fresh memory.
export function loadProgram(machine, program) {
  const mem = new Uint8Array(MEMORY_SIZE);
  for (const [address, byte] of program.memory) mem[address] = byte;
  return {
    ...machine,
    ...display(),
    cpu: createCpu({ mem, ip: program.entry }),
    program,
    devices: machine.bus.initialState(),
    input: [],
    waitingInput: false,
    history: [],
    output: '',
    message: null,
    error: null,
  };
}

const snapshot = (machine) => {
  const { history, velocity, state, ...rest } = machine;
  return rest;
};

// ------------------------------------------------------------ cycle phases

function fetch(machine) {
  const { cpu } = machine;
  const history = [...machine.history, snapshot(machine)];
  if (history.length > HISTORY_LIMIT) history.shift();
  return {
    ...machine,
    history,
    IR: cpu.mem[cpu.ip],
    decoder: DEFAULT_DECODER_VALUE,
    instruction: null,
    activeComponents: [IR],
    activeMemory: [cpu.ip],
    currentLine: machine.program ? machine.program.lines.get(cpu.ip) ?? null : null,
  };
}

function decodeInstruction(machine) {
  const instruction = decode(machine.cpu.mem, machine.cpu.ip);
  return {
    ...machine,
    instruction,
    decoder: instruction.mnemonic || 'ERROR',
    activeComponents: [DECODER],
  };
}

// IP moves past the whole instruction (the bytes after the opcode are read
// as part of this step).
function incrementIP(machine) {
  const { cpu, instruction } = machine;
  const activeMemory = instruction.bytes.map((_, i) => (cpu.ip + i) & 0xffff);
  return {
    ...machine,
    cpu: { ...cpu, ip: (cpu.ip + instruction.length) & 0xffff },
    activeComponents: [IP],
    activeMemory,
  };
}

// Reads the operands: the instruction is executed here, and the next phase
// commits its result, so the UI can show operands and result separately.
function fetchOperands(machine) {
  let result;
  const io = busIO(machine.bus, machine.devices, machine.input);
  try {
    result = execute(machine.cpu, machine.instruction, io);
  } catch (e) {
    return halt(machine, { error: e.message });
  }
  const { events } = result;
  if (events.needsInput) {
    // INT 6 with no key typed: this phase runs again until there is one.
    return { ...machine, waitingInput: true, activeComponents: [] };
  }
  result = { ...result, devices: io.devices, input: io.input };
  const alu = events.alu
    ? { ...machine.alu, OP1: events.alu.op1, OP2: events.alu.op2 ?? 0 }
    : machine.alu;
  return {
    ...machine,
    waitingInput: false,
    pending: result,
    alu,
    activeComponents: [...events.registers, ...(events.alu ? ['OP1', 'OP2'] : [])],
    activeMemory: events.memoryReads,
  };
}

function executeInstruction(machine) {
  const { cpu, events, devices, input } = machine.pending;
  const alu = events.alu ? { ...machine.alu, RES: events.alu.result } : machine.alu;
  const output = events.output.length
    ? machine.output + String.fromCharCode(...events.output)
    : machine.output;
  const next = {
    ...machine,
    cpu,
    devices,
    input,
    pending: null,
    alu,
    output,
    activeComponents: [...events.registers, ...(events.alu ? ['RES', 'FLAGS'] : [])],
    activeMemory: events.memoryWrites,
  };
  if (events.halted) {
    return halt(next, { message: `Programa terminado (${events.halted}).` });
  }
  if (events.breakpoint) {
    return { ...next, state: MACHINE_STATES.PAUSED, message: 'Punto de parada (INT 3).' };
  }
  return next;
}

export const EXECUTION_CYCLE = [fetch, decodeInstruction, incrementIP, fetchOperands, executeInstruction];

const halt = (machine, { message = null, error = null }) => ({
  ...machine,
  state: MACHINE_STATES.STOPPED,
  activeComponents: [],
  pending: null,
  message,
  error,
});

// Runs the next phase of the cycle.
export function stepPhase(machine) {
  const next = EXECUTION_CYCLE[machine.phase](machine);
  if (next.waitingInput) return next;
  if (next.state === MACHINE_STATES.STOPPED && machine.state !== MACHINE_STATES.STOPPED) {
    return { ...next, phase: 0 };
  }
  return { ...next, phase: (machine.phase + 1) % EXECUTION_CYCLE.length };
}

// Runs the remaining phases of the current instruction (or up to INT 6
// waiting for a key).
export function stepInstruction(machine) {
  let m = stepPhase(machine);
  while (m.phase !== 0 && m.state !== MACHINE_STATES.STOPPED && !m.waitingInput) m = stepPhase(m);
  return m;
}

// A key typed on the keyboard, for INT 6.
export const typeKey = (machine, code) => ({
  ...machine,
  input: [...machine.input, code & 0xff],
  waitingInput: false,
});

// Goes back to the state before the current (or previous) instruction.
export function stepBack(machine) {
  if (machine.history.length === 0) return machine;
  const history = machine.history.slice(0, -1);
  const previous = machine.history[machine.history.length - 1];
  return {
    ...machine,
    ...previous,
    history,
    phase: 0,
    state: MACHINE_STATES.PAUSED,
  };
}

// --------------------------------------------------------------- controls

export const start = (machine) => ({ ...machine, state: MACHINE_STATES.RUNNING });

export const resume = (machine) => ({ ...machine, state: MACHINE_STATES.RUNNING });

export const pause = (machine) => ({ ...machine, state: MACHINE_STATES.PAUSED });

export const stop = (machine) => ({
  ...machine,
  state: MACHINE_STATES.STOPPED,
  activeComponents: [],
  pending: null,
  phase: 0,
  decoder: DEFAULT_DECODER_VALUE,
});

export const decreaseVelocity = (machine) => ({
  ...machine,
  velocity: Math.round(Math.min(MIN_VELOCITY, machine.velocity * 1.5)),
});

export const increaseVelocity = (machine) => ({
  ...machine,
  velocity: Math.round(Math.max(MAX_VELOCITY, machine.velocity * 0.5)),
});
