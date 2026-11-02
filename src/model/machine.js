// The machine as the UI sees it: the CPU plus what the fetch-decode-execute
// cycle shows at each phase (IR, decoder, ALU operands, active components),
// and the peripherals of the selected MSX88 configuration.
//
// Every function takes a machine and returns a new one; nothing is mutated.
// Before each instruction the machine keeps a snapshot of itself in
// `history`, which is what stepBack() restores. Snapshots are cheap because
// memory is copied only when an instruction writes it (see cpu.js).

import { createCpu, execute, getFlag, hardwareInterrupt, MEMORY_SIZE } from './cpu';
import { decode } from './decoder';
import { busIO } from './io';
import {
  createSystem,
  pendingInterrupt,
  acknowledgeInterrupt,
  requestInterrupt,
  timerPulse as pulse,
} from './devices';
import {
  INITIAL_VELOCITY,
  MIN_VELOCITY,
  MAX_VELOCITY,
  MACHINE_STATES,
  DEFAULT_DECODER_VALUE,
  IR,
  IP,
  SP,
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
  cpuHalted: false, // after HLT, waiting for an interrupt
});

// `config` is the MSX88 configuration (0-3, see devices/index.js). Tests can
// pass their own `bus` (see io.js).
export const createMachine = ({ config = 0, bus = createSystem(config) } = {}) => ({
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

// Loads an assembled program (see assembler.js) into a fresh memory. The
// switches keep their position.
export function loadProgram(machine, program) {
  const mem = new Uint8Array(MEMORY_SIZE);
  for (const [address, byte] of program.memory) mem[address] = byte;
  const devices = machine.bus.initialState();
  return {
    ...machine,
    ...display(),
    cpu: createCpu({ mem, ip: program.entry }),
    program,
    devices: 'switches' in devices ? { ...devices, switches: machine.devices.switches } : devices,
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

const remember = (machine) => {
  const history = [...machine.history, snapshot(machine)];
  if (history.length > HISTORY_LIMIT) history.shift();
  return history;
};

// One step of time for the peripherals (after every instruction, and while
// the CPU is halted). The CDMA may write memory.
function tickDevices(machine) {
  let mem = machine.cpu.mem;
  let copied = false;
  const writes = [];
  const memory = {
    read: (address) => mem[address & 0xffff],
    write: (address, byte) => {
      if (!copied) {
        mem = mem.slice();
        copied = true;
      }
      mem[address & 0xffff] = byte & 0xff;
      writes.push(address & 0xffff);
    },
  };
  const devices = machine.bus.tick(machine.devices, memory);
  return { devices, mem, writes };
}

// The PIC line the CPU accepts now, or null (I flag set and a request pending).
function acceptedInterrupt(machine) {
  if (!machine.devices.pic || !getFlag(machine.cpu, 'I')) return null;
  return pendingInterrupt(machine.devices);
}

// Can an interrupt ever end a HLT? I is set and some connected line is unmasked.
function canBeInterrupted(machine) {
  if (!machine.devices.pic || !getFlag(machine.cpu, 'I')) return false;
  return ((machine.bus.lines || 0) & ~machine.devices.pic.imr) !== 0;
}

// ------------------------------------------------------------ cycle phases

// Before fetching, the CPU accepts a pending hardware interrupt: it pushes
// the flags and IP and jumps to the routine of the vector the PIC gives.
function serviceInterrupt(machine, line) {
  const { devices, vector } = acknowledgeInterrupt(machine.devices, line);
  const { cpu, events } = hardwareInterrupt(machine.cpu, vector);
  return {
    ...machine,
    history: remember(machine),
    cpu,
    devices,
    cpuHalted: false,
    instruction: null,
    decoder: `INT${line} → tipo ${vector}`,
    activeComponents: ['PIC', IP, SP],
    activeMemory: events.memoryWrites,
    message: null,
    holdPhase: true,
  };
}

function fetch(machine) {
  const line = acceptedInterrupt(machine);
  if (line !== null) return serviceInterrupt(machine, line);
  if (machine.cpuHalted) {
    // HLT: time passes for the peripherals until an interrupt arrives.
    const { devices, mem } = tickDevices(machine);
    return { ...machine, devices, cpu: { ...machine.cpu, mem }, activeComponents: [], holdPhase: true };
  }
  const { cpu } = machine;
  return {
    ...machine,
    history: remember(machine),
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

const deviceComponents = (accessed) => [...accessed].map((name) => name.toUpperCase());

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
    return { ...machine, waitingInput: true, activeComponents: [], holdPhase: true };
  }
  result = { ...result, devices: io.devices, input: io.input, accessed: io.accessed };
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
  const { cpu, events, devices, input, accessed } = machine.pending;
  const alu = events.alu ? { ...machine.alu, RES: events.alu.result } : machine.alu;
  const output = events.output.length
    ? machine.output + String.fromCharCode(...events.output)
    : machine.output;
  const executed = { ...machine, cpu, devices };
  const ticked = tickDevices(executed);
  const next = {
    ...executed,
    cpu: { ...cpu, mem: ticked.mem },
    devices: ticked.devices,
    input,
    pending: null,
    alu,
    output,
    activeComponents: [
      ...events.registers,
      ...(events.alu ? ['RES', 'FLAGS'] : []),
      ...deviceComponents(accessed),
    ],
    activeMemory: [...events.memoryWrites, ...ticked.writes],
  };
  if (events.halted === 'HLT' && canBeInterrupted(next)) {
    return {
      ...next,
      cpuHalted: true,
      message: 'HLT: la CPU espera una interrupción. Esc o "Detener" terminan el programa.',
    };
  }
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

// Runs the next phase of the cycle. A phase that has to wait (INT 6 without
// a key, a halted CPU) or that is not an instruction (accepting an
// interrupt) does not advance to the next one.
export function stepPhase(machine) {
  const { holdPhase, ...next } = EXECUTION_CYCLE[machine.phase](machine);
  if (holdPhase) return next;
  if (next.state === MACHINE_STATES.STOPPED && machine.state !== MACHINE_STATES.STOPPED) {
    return { ...next, phase: 0 };
  }
  return { ...next, phase: (machine.phase + 1) % EXECUTION_CYCLE.length };
}

// Runs the remaining phases of the current instruction (or up to INT 6
// waiting for a key, or an interrupt being accepted).
export function stepInstruction(machine) {
  let m = stepPhase(machine);
  while (m.phase !== 0 && m.state !== MACHINE_STATES.STOPPED && !m.waitingInput) m = stepPhase(m);
  return m;
}

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

// ------------------------------------------------------------ outside world

// Events from outside (keys, switches, F10, the timer clock) can arrive
// between the operands and the execute phases, when the result of the
// instruction is already computed in `pending`: they apply to both, or the
// commit would lose them.
const fromOutside = (machine, field, f) => ({
  ...machine,
  [field]: f(machine[field]),
  pending: machine.pending && { ...machine.pending, [field]: f(machine.pending[field]) },
});

// A key typed on the keyboard, for INT 6.
export const typeKey = (machine, code) => ({
  ...fromOutside(machine, 'input', (input) => [...input, code & 0xff]),
  waitingInput: false,
});

// F10: interrupt request on INT0 of the PIC.
export const pressF10 = (machine) =>
  machine.devices.pic ? fromOutside(machine, 'devices', (d) => requestInterrupt(d, 0)) : machine;

// One pulse of the timer's 1 Hz clock.
export const timerPulse = (machine) =>
  machine.devices.timer ? fromOutside(machine, 'devices', pulse) : machine;

// Flips switch n (0-7) of the switch bar (configuration 0).
export const toggleSwitch = (machine, n) =>
  'switches' in machine.devices
    ? fromOutside(machine, 'devices', (d) => ({ ...d, switches: d.switches ^ (1 << n) }))
    : machine;

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
  cpuHalted: false,
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
