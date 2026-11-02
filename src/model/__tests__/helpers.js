// Test helpers: assemble and run programs headlessly.
import { assemble } from '../assembler';
import { createCpu, step, readReg, getFlag, initialMemory } from '../cpu';
import { hex8 } from '../format';

export const hex = (s) => parseInt(s, 16);

// Bytes of a source, as hex strings, in address order ('?' bytes skipped).
export function bytes(source) {
  return assemble(source)
    .listing.flatMap((entry) => entry.bytes)
    .filter((b) => b !== null)
    .map(hex8);
}

// Bytes of a single instruction / line assembled at 2000h.
export const encode = (line) => bytes(`ORG 2000h\n${line}\nEND`);

// A CPU with MSX88's initial memory (the vector table of the monitor) plus
// `memoryBytes`.
export function cpuWith(memoryBytes = {}, { ip = 0x2000, regs = {}, flags = 0 } = {}) {
  const mem = initialMemory();
  for (const [address, value] of Object.entries(memoryBytes)) mem[Number(address)] = value;
  const cpu = createCpu({ mem, ip });
  return { ...cpu, regs: { ...cpu.regs, ...regs }, flags };
}

// Loads bytes at 2000h
export const cpuWithCode = (codeBytes, options) =>
  cpuWith(Object.fromEntries(codeBytes.map((b, i) => [0x2000 + i, b])), options);

// Assembles and runs until HLT / INT 0, at the CPU level.
export function run(source, { maxInstructions = 10000 } = {}) {
  const program = assemble(source);
  const mem = initialMemory();
  for (const [address, byte] of program.memory) mem[address] = byte;
  let cpu = createCpu({ mem, ip: program.entry });
  let output = '';
  for (let i = 0; i < maxInstructions; i++) {
    const result = step(cpu);
    cpu = result.cpu;
    // one line per INT 7
    output += result.events.output.map((line) => `${String.fromCharCode(...line)}\n`).join('');
    if (result.events.halted) {
      return { cpu, halted: result.events.halted, output, program, steps: i + 1 };
    }
  }
  throw new Error(`Program did not halt after ${maxInstructions} instructions`);
}

export const reg = (cpu, name) => readReg(cpu, name);
export const flag = (cpu, name) => getFlag(cpu, name);
export const byteAt = (cpu, address) => cpu.mem[address];
export const wordAt = (cpu, address) => cpu.mem[address] | (cpu.mem[address + 1] << 8);
