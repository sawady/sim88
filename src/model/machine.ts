// The machine as the UI sees it: the CPU plus what the fetch-decode-execute
// cycle shows at each phase (IR, decoder, ALU operands, active components),
// and the peripherals of the selected MSX88 configuration.
//
// Every function takes a machine and returns a new one; nothing is mutated.
// Before each instruction the machine keeps a snapshot of itself in
// `history`, which is what stepBack() restores. Snapshots are cheap because
// memory is copied only when an instruction writes it (see cpu.ts).

import { createCpu, execute, getFlag, hardwareInterrupt, initialMemory } from './cpu';
import { ALU_MODES, DEFAULT_ALU_MODE } from './alu';
import { decode } from './decoder';
import { busIO } from './io';
import { cp437 } from './format';
import {
  createSystem,
  pendingInterrupt,
  acknowledgeInterrupt,
  requestInterrupt,
  timerPulse as pulse,
} from './devices';
import { setPrintInterval as withPrintInterval } from './devices/printer';
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

import type { AluMode } from './alu';
import type { Program } from './assembler';
import type { Cpu, CpuResult } from './cpu';
import type { Instruction } from './decoder';
import type { BusMemory, Bus } from './io';
import type { Devices } from './devices/types';
import type { MachineState } from './constants';

export const HISTORY_LIMIT = 1000;

// The result of an instruction between the operands phase, which runs it, and
// the execute phase, which commits it.
export interface Pending extends CpuResult {
  devices: Devices;
  input: number[];
  accessed: Set<string>;
}

interface Display {
  IR: number;
  decoder: string;
  instruction: Instruction | null;
  pending: Pending | null;
  alu: { OP1: number; OP2: number; RES: number };
  activeComponents: string[];
  activeMemory: number[];
  phase: number;
  currentLine: number | null;
  cpuHalted: boolean;
}

export interface Machine extends Display {
  cpu: Cpu;
  aluMode: AluMode;
  bus: Bus<Devices>;
  devices: Devices;
  input: number[];
  waitingInput: boolean;
  state: MachineState;
  velocity: number;
  history: Snapshot[];
  program: Program | null;
  output: string;
  message: string | null;
  error: string | null;
  holdPhase?: boolean; // the phase has to run again, or was not part of the instruction
}

export type Snapshot = Omit<Machine, 'history' | 'velocity' | 'state' | 'aluMode'>;

type Phase = (machine: Machine) => Machine;

const display = (): Display => ({
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

// `config` is the MSX88 configuration (0-3, see devices/index.ts). Tests can
// pass their own `bus` (see io.ts). `aluMode` is 'msx88' (as the original) or
// '8086' (see alu.ts and cpu.ts).
export const createMachine = ({
  config = 0,
  bus = createSystem(config) as Bus<Devices>,
  aluMode = DEFAULT_ALU_MODE,
} = {}): Machine => ({
  cpu: createCpu(),
  ...display(),
  aluMode,
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

// Loads an assembled program (see assembler.ts) into a fresh memory. The
// switches keep their position and the printer its speed.
export function loadProgram(machine: Machine, program: Program): Machine {
  const mem = initialMemory();
  for (const [address, byte] of program.memory) mem[address] = byte;
  let devices = machine.bus.initialState();
  if (devices.printer && machine.devices.printer) {
    devices = withPrintInterval(devices, machine.devices.printer.interval);
  }
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

// The ALU mode is a setting, not part of the run: step back keeps it.
const snapshot = (machine: Machine): Snapshot => {
  const { history, velocity, state, aluMode, ...rest } = machine;
  return rest;
};

const remember = (machine: Machine): Snapshot[] => {
  const history = [...machine.history, snapshot(machine)];
  if (history.length > HISTORY_LIMIT) history.shift();
  return history;
};

// One step of time for the peripherals (after every instruction, and while
// the CPU is halted). The CDMA may write memory.
function tickDevices(machine: Machine): { devices: Devices; mem: Uint8Array; writes: number[] } {
  let mem = machine.cpu.mem;
  let copied = false;
  const writes: number[] = [];
  const memory: BusMemory = {
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
function acceptedInterrupt(machine: Machine): number | null {
  if (!machine.devices.pic || !getFlag(machine.cpu, 'I')) return null;
  return pendingInterrupt(machine.devices);
}

// ------------------------------------------------------------ cycle phases

// Before fetching, the CPU accepts a pending hardware interrupt: it pushes
// the flags and IP and jumps to the routine of the vector the PIC gives.
function serviceInterrupt(machine: Machine, line: number): Machine {
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

function fetch(machine: Machine): Machine {
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

function decodeInstruction(machine: Machine): Machine {
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
function incrementIP(machine: Machine): Machine {
  const { cpu } = machine;
  const instruction = machine.instruction!;
  const activeMemory = instruction.bytes.map((_, i) => (cpu.ip + i) & 0xffff);
  return {
    ...machine,
    cpu: { ...cpu, ip: (cpu.ip + instruction.length) & 0xffff },
    activeComponents: [IP],
    activeMemory,
  };
}

const deviceComponents = (accessed: Set<string>): string[] => [...accessed].map((name) => name.toUpperCase());

// Reads the operands: the instruction is executed here, and the next phase
// commits its result, so the UI can show operands and result separately.
function fetchOperands(machine: Machine): Machine {
  let executed: CpuResult;
  const io = busIO(machine.bus, machine.devices, machine.input);
  try {
    executed = execute(machine.cpu, machine.instruction!, io, { aluMode: machine.aluMode });
  } catch (e) {
    return halt(machine, { error: (e as Error).message });
  }
  const { events } = executed;
  if (events.needsInput) {
    // INT 6 with no key typed: this phase runs again until there is one.
    return { ...machine, waitingInput: true, activeComponents: [], holdPhase: true };
  }
  const result: Pending = { ...executed, devices: io.devices, input: io.input, accessed: io.accessed };
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

function executeInstruction(machine: Machine): Machine {
  const { cpu, events, devices, input, accessed } = machine.pending!;
  const alu = events.alu ? { ...machine.alu, RES: events.alu.result } : machine.alu;
  // Every INT 7 writes one line, as MSX88's screen does.
  const output = events.output.reduce((text, line) => `${text}${cp437(line)}\n`, machine.output);
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
      ...(events.alu ? ['RES', ...(events.alu.flags === false ? [] : ['FLAGS'])] : []),
      ...deviceComponents(accessed),
    ],
    activeMemory: [...events.memoryWrites, ...ticked.writes],
  };
  // HLT always waits for an interrupt, even when none can arrive (I = 0, or
  // every line masked): on MSX88 only ESC ends it (tests/fidelity: hlt-cli).
  if (events.halted === 'HLT') {
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

export const EXECUTION_CYCLE: Phase[] = [fetch, decodeInstruction, incrementIP, fetchOperands, executeInstruction];

const halt = (
  machine: Machine,
  { message = null, error = null }: { message?: string | null; error?: string | null }
): Machine => ({
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
export function stepPhase(machine: Machine): Machine {
  const { holdPhase, ...next } = EXECUTION_CYCLE[machine.phase](machine);
  if (holdPhase) return next;
  if (next.state === MACHINE_STATES.STOPPED && machine.state !== MACHINE_STATES.STOPPED) {
    return { ...next, phase: 0 };
  }
  return { ...next, phase: (machine.phase + 1) % EXECUTION_CYCLE.length };
}

// Runs the remaining phases of the current instruction (or up to INT 6
// waiting for a key, or an interrupt being accepted).
export function stepInstruction(machine: Machine): Machine {
  let m = stepPhase(machine);
  while (m.phase !== 0 && m.state !== MACHINE_STATES.STOPPED && !m.waitingInput) m = stepPhase(m);
  return m;
}

// Goes back to the state before the current (or previous) instruction.
export function stepBack(machine: Machine): Machine {
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
const fromOutside = <K extends 'input' | 'devices'>(
  machine: Machine,
  field: K,
  f: (value: Machine[K]) => Machine[K]
): Machine => ({
  ...machine,
  [field]: f(machine[field]),
  pending: machine.pending && { ...machine.pending, [field]: f(machine.pending[field] as Machine[K]) },
});

// A key typed on the keyboard, for INT 6.
export const typeKey = (machine: Machine, code: number): Machine => ({
  ...fromOutside(machine, 'input', (input) => [...input, code & 0xff]),
  waitingInput: false,
});

// F10: interrupt request on INT0 of the PIC.
export const pressF10 = (machine: Machine): Machine =>
  machine.devices.pic ? fromOutside(machine, 'devices', (d) => requestInterrupt(d, 0)) : machine;

// One pulse of the timer's 1 Hz clock.
export const timerPulse = (machine: Machine): Machine =>
  machine.devices.timer ? fromOutside(machine, 'devices', pulse) : machine;

// Speed of the printer: one character every `interval` instructions.
export const setPrintInterval = (machine: Machine, interval: number): Machine =>
  machine.devices.printer
    ? fromOutside(machine, 'devices', (d) => withPrintInterval(d, interval))
    : machine;

// How the ALU behaves where MSX88 and the 8086 differ: 'msx88' or '8086'.
// It applies from the next instruction on.
export const setAluMode = (machine: Machine, aluMode: AluMode): Machine => (ALU_MODES[aluMode] ? { ...machine, aluMode } : machine);

// Flips switch n (0-7) of the switch bar (configuration 0).
export const toggleSwitch = (machine: Machine, n: number): Machine =>
  'switches' in machine.devices
    ? fromOutside(machine, 'devices', (d) => ({ ...d, switches: d.switches ^ (1 << n) }))
    : machine;

// --------------------------------------------------------------- controls

export const start = (machine: Machine): Machine => ({ ...machine, state: MACHINE_STATES.RUNNING });

export const resume = (machine: Machine): Machine => ({ ...machine, state: MACHINE_STATES.RUNNING });

export const pause = (machine: Machine): Machine => ({ ...machine, state: MACHINE_STATES.PAUSED });

export const stop = (machine: Machine): Machine => ({
  ...machine,
  state: MACHINE_STATES.STOPPED,
  activeComponents: [],
  pending: null,
  phase: 0,
  cpuHalted: false,
  decoder: DEFAULT_DECODER_VALUE,
});

export const decreaseVelocity = (machine: Machine): Machine => ({
  ...machine,
  velocity: Math.round(Math.min(MIN_VELOCITY, machine.velocity * 1.5)),
});

export const increaseVelocity = (machine: Machine): Machine => ({
  ...machine,
  velocity: Math.round(Math.max(MAX_VELOCITY, machine.velocity * 0.5)),
});
