// CPU state and instruction execution.
//
// The state is immutable: execute() returns a new state. Memory is a 64 KB
// Uint8Array that is copied only when an instruction writes to it, so keeping
// the state of every step (for "step back") shares the unchanged memory.
//
// cpu = {
//   mem,                         Uint8Array(65536)
//   regs: { AX, BX, CX, DX, SP, BP, SI, DI },   16 bit values
//   ip,
//   flags,                       16 bit FLAGS word (8086 layout, see FLAG_BITS)
// }

import { BINARY as ALU_BINARY, UNARY as ALU_UNARY } from './alu';
import { decode } from './decoder';
import { REG8 } from './isa';
import { asmHex, hex16 } from './format';

export const MEMORY_SIZE = 0x10000;
export const CODE_START = 0x2000;
// Top of the user memory (0000h-7FFFh): the first PUSH writes 7FFEh-7FFFh.
export const STACK_TOP = 0x8000;

export const FLAG_BITS = { C: 0, P: 2, A: 4, Z: 6, S: 7, T: 8, I: 9, D: 10, O: 11 };

// MSX88 starts with interrupts enabled (I = 1) and every other flag cleared
// (seen on MSX88 V-3.1: tests/fidelity, init-state).
export const INITIAL_FLAGS = 1 << FLAG_BITS.I;

// The system interrupts of the MSX88 monitor (INT 0, 3, 6 and 7). Their
// vectors point into the vector table itself, at 4n+2, where the monitor keeps
// an IRET (CFh): MSX88's memory starts as 02 00 CF 00 at 0, 0E 00 CF 00 at 0Ch,
// 1A 00 CF 00 at 18h and 1E 00 CF 00 at 1Ch, and zeros everywhere else.
export const SYSTEM_VECTORS = [0, 3, 6, 7];
const IRET_OPCODE = 0xcf;
const systemVectorTarget = (n) => 4 * n + 2;

export function initialMemory() {
  const mem = new Uint8Array(MEMORY_SIZE);
  for (const n of SYSTEM_VECTORS) {
    mem[4 * n] = systemVectorTarget(n);
    mem[4 * n + 2] = IRET_OPCODE;
  }
  return mem;
}

export class CpuError extends Error {
  constructor(message, address) {
    super(message);
    this.name = 'CpuError';
    this.address = address;
  }
}

export function createCpu({ mem = initialMemory(), ip = CODE_START } = {}) {
  return {
    mem,
    regs: { AX: 0, BX: 0, CX: 0, DX: 0, SP: STACK_TOP, BP: 0, SI: 0, DI: 0 },
    ip,
    flags: INITIAL_FLAGS,
  };
}

export const getFlag = (cpu, name) => ((cpu.flags >> FLAG_BITS[name]) & 1) === 1;

export function readReg(cpu, name) {
  if (REG8.includes(name)) {
    const value = cpu.regs[`${name[0]}X`];
    return name[1] === 'L' ? value & 0xff : value >> 8;
  }
  return cpu.regs[name];
}

export const readByte = (mem, address) => mem[address & 0xffff];
export const readWord = (mem, address) => mem[address & 0xffff] | (mem[(address + 1) & 0xffff] << 8);

// What the CPU sees outside itself: the I/O bus (IN/OUT) and the keyboard
// (INT 6). The machine provides a real one (see machine.js and io.js).
export const NO_IO = {
  in: () => 0,
  out: () => {},
  readChar: () => undefined,
};

// Mutable scratch copy of the state while one instruction executes.
class Execution {
  constructor(cpu, instruction, io) {
    this.cpu = cpu;
    this.instruction = instruction;
    this.io = io;
    this.regs = { ...cpu.regs };
    this.ip = cpu.ip;
    this.flags = cpu.flags;
    this.mem = cpu.mem;
    this.memCopied = false;
    // What happened, for the UI
    this.events = {
      halted: null, // 'HLT' | 'INT 0'
      breakpoint: false,
      alu: null, // { op1, op2, result }
      registers: new Set(), // registers read or written
      memoryReads: [],
      memoryWrites: [],
      output: [], // lines written to the console (INT 7), as arrays of bytes
      needsInput: false, // INT 6 found no key: the instruction must be retried
      ports: [], // { port, value, direction: 'in' | 'out' }
    };
  }

  // registers
  reg(name) {
    this.events.registers.add(REG8.includes(name) ? `${name[0]}X` : name);
    if (REG8.includes(name)) {
      const value = this.regs[`${name[0]}X`];
      return name[1] === 'L' ? value & 0xff : value >> 8;
    }
    return this.regs[name];
  }

  setReg(name, value) {
    if (REG8.includes(name)) {
      const full = `${name[0]}X`;
      this.events.registers.add(full);
      const prev = this.regs[full];
      this.regs[full] = name[1] === 'L' ? (prev & 0xff00) | (value & 0xff) : (prev & 0xff) | ((value & 0xff) << 8);
    } else {
      this.events.registers.add(name);
      this.regs[name] = value & 0xffff;
    }
  }

  // memory
  readMem(address, size) {
    const a = address & 0xffff;
    this.events.memoryReads.push(a);
    if (size === 16) this.events.memoryReads.push((a + 1) & 0xffff);
    return size === 8 ? readByte(this.mem, a) : readWord(this.mem, a);
  }

  writeMem(address, size, value) {
    if (!this.memCopied) {
      this.mem = this.mem.slice();
      this.memCopied = true;
    }
    const a = address & 0xffff;
    this.mem[a] = value & 0xff;
    this.events.memoryWrites.push(a);
    if (size === 16) {
      this.mem[(a + 1) & 0xffff] = (value >> 8) & 0xff;
      this.events.memoryWrites.push((a + 1) & 0xffff);
    }
  }

  effectiveAddress(operand) {
    return operand.base.reduce((sum, name) => sum + this.reg(name), operand.disp) & 0xffff;
  }

  // operands
  read(operand) {
    switch (operand.type) {
      case 'reg':
        return this.reg(operand.name);
      case 'mem':
        return this.readMem(this.effectiveAddress(operand), operand.size);
      case 'imm':
        return operand.value;
      case 'rel':
        return operand.target;
      default:
        throw new Error(`Cannot read operand ${operand.type}`);
    }
  }

  write(operand, value) {
    switch (operand.type) {
      case 'reg':
        return this.setReg(operand.name, value);
      case 'mem':
        return this.writeMem(this.effectiveAddress(operand), operand.size, value);
      default:
        throw new Error(`Cannot write operand ${operand.type}`);
    }
  }

  // flags
  flag(name) {
    return ((this.flags >> FLAG_BITS[name]) & 1) === 1;
  }

  setFlags(values) {
    for (const [name, on] of Object.entries(values)) {
      const bit = 1 << FLAG_BITS[name];
      this.flags = on ? this.flags | bit : this.flags & ~bit;
    }
  }

  // stack
  push(value) {
    this.setReg('SP', this.reg('SP') - 2);
    this.writeMem(this.regs.SP, 16, value);
  }

  pop() {
    const value = this.readMem(this.regs.SP, 16);
    this.setReg('SP', this.regs.SP + 2);
    return value;
  }

  result() {
    return {
      cpu: { mem: this.mem, regs: this.regs, ip: this.ip, flags: this.flags },
      events: this.events,
    };
  }
}

const CONDITIONS = {
  JO: (f) => f('O'),
  JNO: (f) => !f('O'),
  JC: (f) => f('C'),
  JNC: (f) => !f('C'),
  JZ: (f) => f('Z'),
  JNZ: (f) => !f('Z'),
  JBE: (f) => f('C') || f('Z'),
  JA: (f) => !f('C') && !f('Z'),
  JS: (f) => f('S'),
  JNS: (f) => !f('S'),
  JP: (f) => f('P'),
  JNP: (f) => !f('P'),
  JL: (f) => f('S') !== f('O'),
  JGE: (f) => f('S') === f('O'),
  JLE: (f) => f('Z') || f('S') !== f('O'),
  JG: (f) => !f('Z') && f('S') === f('O'),
};

// System interrupts handled by the MSX88 monitor. On MSX88, INT 0/3/6/7 go
// through the vector table like any INT: the flags and IP are pushed, and
// the vector leads to the monitor's IRET at 4n+2, which returns. The monitor
// does its job in between. So the stack keeps the pushed IP and flags (below
// SP), SP and the flags end as they were, and IP points after the INT.
// A program that replaces one of those vectors gets its own routine and no
// monitor service (tests/fidelity: int-vector-0-replaced). Hardware
// interrupts with those types only run the IRET (pic-hw-type-0, -7).
const SYSTEM_INTERRUPTS = {
  0: (x) => {
    x.events.halted = 'INT 0';
  },
  3: (x) => {
    x.events.breakpoint = true;
  },
  6: (x) => {
    // INT 6: waits for a key and stores its code at the address in BX (no echo).
    const code = x.io.readChar();
    if (code === undefined) {
      x.events.needsInput = true;
      return;
    }
    x.writeMem(x.reg('BX'), 8, code);
  },
  7: (x) => {
    // INT 7: writes AL bytes starting at the address in BX, as one line of
    // the console (an empty one if AL = 0).
    const count = x.reg('AL');
    const start = x.reg('BX');
    const line = [];
    for (let i = 0; i < count; i++) line.push(x.readMem(start + i, 8));
    x.events.output.push(line);
  },
};

// Interrupt entry, for INT n and for the PIC: push the flags and IP, clear I
// and T, and jump to the routine in the vector table (4 bytes per vector; the
// first word is the address of the routine: MSX88 has no segments).
function enterInterrupt(x, n) {
  x.push(x.flags);
  x.setFlags({ I: false, T: false });
  x.push(x.ip);
  x.ip = x.readMem(n * 4, 16);
}

function returnFromInterrupt(x) {
  x.ip = x.pop();
  x.flags = x.pop();
}

function softwareInterrupt(x, n) {
  enterInterrupt(x, n);
  if (SYSTEM_INTERRUPTS[n] && x.ip === systemVectorTarget(n) && x.readMem(x.ip, 8) === IRET_OPCODE) {
    SYSTEM_INTERRUPTS[n](x);
    returnFromInterrupt(x);
  }
}

// A hardware interrupt accepted between instructions (vector = the type the
// PIC gives).
export function hardwareInterrupt(cpu, vector) {
  const x = new Execution(cpu, null, NO_IO);
  enterInterrupt(x, vector);
  return x.result();
}

const EXECUTORS = {
  MOV: (x, [dst, src]) => x.write(dst, x.read(src)),

  ...Object.fromEntries(
    Object.entries(ALU_BINARY).map(([mnemonic, operation]) => [
      mnemonic,
      (x, [dst, src], size) => {
        const a = x.read(dst);
        const b = x.read(src);
        const { result, flags } = operation(size, a, b, x.flag('C'));
        x.setFlags(flags);
        if (mnemonic !== 'CMP') x.write(dst, result);
        x.events.alu = { op1: a, op2: b, result, size };
      },
    ])
  ),

  ...Object.fromEntries(
    Object.entries(ALU_UNARY).map(([mnemonic, operation]) => [
      mnemonic,
      (x, [operand], size) => {
        const a = x.read(operand);
        const { result, flags } = operation(size, a);
        x.setFlags(flags);
        x.write(operand, result);
        x.events.alu = { op1: a, op2: null, result, size };
      },
    ])
  ),

  // PUSH SP pushes 0000h on MSX88 (tests/fidelity: stack-push-sp).
  PUSH: (x, [src]) => x.push(src.type === 'reg' && src.name === 'SP' ? 0 : x.read(src)),
  POP: (x, [dst]) => x.write(dst, x.pop()),
  PUSHF: (x) => x.push(x.flags),
  POPF: (x) => {
    x.flags = x.pop();
  },

  JMP: (x, [target]) => {
    x.ip = target.target;
  },
  ...Object.fromEntries(
    Object.entries(CONDITIONS).map(([mnemonic, condition]) => [
      mnemonic,
      (x, [target]) => {
        if (condition((name) => x.flag(name))) x.ip = target.target;
      },
    ])
  ),
  CALL: (x, [target]) => {
    x.push(x.ip);
    x.ip = target.target;
  },
  RET: (x, [release]) => {
    x.ip = x.pop();
    if (release) x.setReg('SP', x.regs.SP + release.value);
  },

  INT: (x, [number]) => softwareInterrupt(x, number.value),
  IRET: (x) => returnFromInterrupt(x),
  IN: (x, [dst, port], size) => {
    const address = port.type === 'imm' ? port.value : x.reg('DX');
    let value = x.io.in(address) & 0xff;
    if (size === 16) value |= (x.io.in((address + 1) & 0xffff) & 0xff) << 8;
    x.events.ports.push({ port: address, value, direction: 'in' });
    x.write(dst, value);
  },
  OUT: (x, [port, src], size) => {
    const address = port.type === 'imm' ? port.value : x.reg('DX');
    const value = x.read(src);
    x.io.out(address, value & 0xff);
    if (size === 16) x.io.out((address + 1) & 0xffff, value >> 8);
    x.events.ports.push({ port: address, value, direction: 'out' });
  },
  CLI: (x) => x.setFlags({ I: false }),
  STI: (x) => x.setFlags({ I: true }),

  NOP: () => {},
  HLT: (x) => {
    x.events.halted = 'HLT';
  },
};

export const IMPLEMENTED = Object.keys(EXECUTORS);


// Executes one decoded instruction. IP must already point to the next one
// (the machine increments it after decoding, as the real cycle does).
export function execute(cpu, instruction, io = NO_IO) {
  const x = new Execution(cpu, instruction, io);
  const run = instruction.mnemonic && EXECUTORS[instruction.mnemonic];
  if (!instruction.mnemonic) {
    throw new CpuError(
      `Unknown opcode ${asmHex(instruction.opcode)} at ${hex16(instruction.address)}h.`,
      instruction.address
    );
  }
  if (!run) {
    throw new CpuError(
      `${instruction.mnemonic} is not implemented yet (at ${hex16(instruction.address)}h).`,
      instruction.address
    );
  }
  run(x, instruction.operands, instruction.size);
  return x.result();
}

// Fetch, decode and execute one instruction.
export function step(cpu, io = NO_IO) {
  const instruction = decode(cpu.mem, cpu.ip);
  const advanced = { ...cpu, ip: (cpu.ip + instruction.length) & 0xffff };
  return { instruction, ...execute(advanced, instruction, io) };
}
