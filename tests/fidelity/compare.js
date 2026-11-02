// Compares SIM88 with the golden results recorded by running the same
// programs on the original MSX88 / ASM88 (see tools/oracle/README.md).
//
// Every program in tests/fidelity/programs has a golden file in
// tests/fidelity/golden/<name>.json with:
//   assembler: errors, warnings, listing (address, bytes, line) from the .LST
//   run:       status ('stopped' | 'timeout' | 'error'), registers, flags,
//              memory (runs of bytes that differ from the initial memory) and
//              the command window text after `G`.
//
// compareProgram() returns the list of differences (empty when SIM88 matches).

import fs from 'node:fs';
import path from 'node:path';
import { assemble } from '../../src/model/assembler';
import {
  createMachine,
  loadProgram,
  start,
  stepInstruction,
  typeKey,
  pressF10,
  timerPulse,
  toggleSwitch,
} from '../../src/model/machine';
import { MACHINE_STATES } from '../../src/model/constants';

export const FIDELITY_DIR = path.resolve(__dirname);
export const PROGRAMS_DIR = path.join(FIDELITY_DIR, 'programs');
export const GOLDEN_DIR = path.join(FIDELITY_DIR, 'golden');

// Flags MSX88 shows (I Z S O C A P), in the 8086 FLAGS layout it also uses.
export const VISIBLE_FLAGS = 0x0ad5;
// The user memory. MSX88 keeps the monitor in 8000h-FFFFh, and its own stack
// frames leak into that area of the simulated memory while it runs.
export const USER_MEMORY_END = 0x8000;
// Bytes of MSX88's initial memory that are not part of the machine: what the
// PC's RAM had where MSX88 allocated its memory (only seen at 016Ch-0170h).
const INITIAL_NOISE = [0x16c, 0x16d, 0x16e, 0x16f, 0x170];
// Steps SIM88 runs before calling a program "still running" (MSX88 'timeout').
const MAX_STEPS = 100000;

const hex2 = (n) => n.toString(16).toUpperCase().padStart(2, '0');
const hex4 = (n) => n.toString(16).toUpperCase().padStart(4, '0');

export function parseMeta(source) {
  const meta = {};
  for (const line of source.split(/\r?\n/)) {
    const m = line.match(/^\s*;;\s*([a-z0-9-]+)\s*:\s*(.*?)\s*$/);
    if (m) meta[m[1]] = m[2];
  }
  return meta;
}

export function loadCorpus() {
  return fs
    .readdirSync(PROGRAMS_DIR)
    .filter((f) => f.endsWith('.asm'))
    .sort()
    .map((file) => {
      const name = file.slice(0, -4);
      const source = fs.readFileSync(path.join(PROGRAMS_DIR, file), 'latin1');
      const goldenPath = path.join(GOLDEN_DIR, `${name}.json`);
      const golden = fs.existsSync(goldenPath) ? JSON.parse(fs.readFileSync(goldenPath, 'utf8')) : null;
      return { name, source, meta: parseMeta(source), golden };
    });
}

export function initialMemory() {
  const { nonzero } = JSON.parse(fs.readFileSync(path.join(GOLDEN_DIR, '_initial-memory.json'), 'utf8'));
  const mem = new Uint8Array(0x10000);
  for (const [address, byte] of Object.entries(nonzero)) mem[parseInt(address, 16)] = parseInt(byte, 16);
  return mem;
}

// ------------------------------------------------------------- assembler

function assembleSim88(source) {
  try {
    return { program: assemble(source, { strict: true }) };
  } catch (error) {
    return { error };
  }
}

export function compareAssembler(source, golden) {
  const diffs = [];
  const { program, error } = assembleSim88(source);
  const asmErrors = golden.assembler.errors;
  if (asmErrors > 0 && !error) diffs.push(`assembler: ASM88 gives ${asmErrors} error(s), SIM88 accepts the program`);
  if (asmErrors === 0 && error) diffs.push(`assembler: ASM88 accepts the program, SIM88 says: ${error.message}`);
  if (asmErrors !== 0 || error || !golden.assembler.listing) return { diffs, program };

  const expected = new Map();
  for (const row of golden.assembler.listing) {
    row.bytes.forEach((b, i) => expected.set(parseInt(row.address, 16) + i, b));
  }
  const actual = new Map();
  for (const entry of program.listing) {
    entry.bytes.forEach((b, i) => {
      // `DB ?` reserves without a value: ASM88 lists whatever was there.
      if (b === null) expected.delete(entry.address + i);
      else actual.set(entry.address + i, hex2(b));
    });
  }
  const addresses = [...new Set([...expected.keys(), ...actual.keys()])].sort((a, b) => a - b);
  const bad = addresses.filter((a) => expected.get(a) !== actual.get(a));
  if (bad.length) {
    const shown = bad
      .slice(0, 6)
      .map((a) => `${hex4(a)}h: ASM88 ${expected.get(a) ?? '--'}, SIM88 ${actual.get(a) ?? '--'}`);
    diffs.push(`bytes differ at ${bad.length} address(es): ${shown.join('; ')}`);
  }
  return { diffs, program };
}

// ------------------------------------------------------------- execution

// What happens while the program runs, in SIM88 terms. The oracle times its
// keys in seconds; SIM88 gets them as steps (`;; sim88: ...` in the source):
//   f10@N        F10 after N steps
//   pulse/N      a timer pulse every N steps
// Keys for INT 6 (`keys:` letters) are typed before running (SIM88 buffers).
function plannedEvents(meta) {
  const events = { f10: [], pulseEvery: 0, keys: [], switches: null };
  for (const item of (meta.sim88 || '').split(/\s+/).filter(Boolean)) {
    let m;
    if ((m = item.match(/^f10@(\d+)$/))) events.f10.push(Number(m[1]));
    else if ((m = item.match(/^pulse\/(\d+)$/))) events.pulseEvery = Number(m[1]);
    else throw new Error(`unknown sim88 event ${item}`);
  }
  for (const key of (meta.keys || '').split(/\s+/).filter(Boolean)) {
    const name = key.split(':')[1];
    if (name === 'ret') events.keys.push(13);
    else if (/^shift-[a-z]$/.test(name)) events.keys.push(name.toUpperCase().charCodeAt(6));
    else if (/^[a-z0-9]$/.test(name)) events.keys.push(name.charCodeAt(0));
  }
  for (const cmd of (meta.monitor || '').split('|').map((c) => c.trim())) {
    const m = cmd.match(/^M\s+([0-9A-F]{2})$/i);
    if (m) events.switches = parseInt(m[1], 16);
  }
  return events;
}

export function runSim88(program, meta) {
  const config = Number(meta.config || 0);
  let machine = loadProgram(createMachine({ config }), program);
  const events = plannedEvents(meta);
  if (events.switches !== null) {
    for (let bit = 0; bit < 8; bit++) if (events.switches & (1 << bit)) machine = toggleSwitch(machine, bit);
  }
  for (const code of events.keys) machine = typeKey(machine, code);
  machine = start(machine);
  let status = 'timeout';
  for (let n = 1; n <= MAX_STEPS; n++) {
    if (events.f10.includes(n)) machine = pressF10(machine);
    if (events.pulseEvery && n % events.pulseEvery === 0) machine = timerPulse(machine);
    machine = stepInstruction(machine);
    if (machine.error) {
      status = 'error';
      break;
    }
    if (machine.state !== MACHINE_STATES.RUNNING) {
      status = 'stopped';
      break;
    }
  }
  return { machine, status };
}

// The text INT 7 wrote, from the oracle's command window: the window is
// cleared before `G`, so its lines are ">G", the output, and the prompt.
export function windowOutput(window) {
  const lines = [...window];
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  if (lines.length && /^>_?$/.test(lines[lines.length - 1])) lines.pop();
  if (lines.length && lines[0] === '>G') lines.shift();
  // MSX88's own messages (execution errors) are not program output.
  return lines.filter((line) => !line.startsWith('Error en la ejecuci'));
}

// Characters with the same glyph in MSX88's font (O and 0): the oracle reads
// them as one of them, so SIM88's text is normalized the same way.
let sameGlyph = null;
function normalizeGlyphs(text) {
  if (!sameGlyph) {
    const file = path.join(GOLDEN_DIR, '_font.json');
    sameGlyph = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')).same_glyph : {};
  }
  // Control and non ASCII characters: the oracle only knows the printable
  // ASCII glyphs and reads the others as U+FFFD.
  return [...text].map((ch) => (ch < ' ' || ch > '~' ? '\ufffd' : sameGlyph[ch] ?? ch)).join('');
}

// SIM88's console text split into lines as the MSX88 window shows it.
// The command window of MSX88 is 60 characters wide.
export const WINDOW_COLUMNS = 60;

// Each INT 7 call is one line of SIM88's output (see machine.js), wrapped as
// the MSX88 window wraps it.
export function consoleLines(output) {
  if (!output) return [];
  return output
    .replace(/\n$/, '')
    .split('\n')
    .flatMap((line) => {
      const parts = [];
      for (let i = 0; i < line.length || i === 0; i += WINDOW_COLUMNS) parts.push(line.slice(i, i + WINDOW_COLUMNS));
      return parts;
    })
    .map(normalizeGlyphs);
}

export function compareRun(program, meta, golden, initial) {
  const diffs = [];
  const expected = golden.run;
  if (!expected || expected.status === 'oracle-error') return diffs;
  const { machine, status } = runSim88(program, meta);
  if (status !== expected.status) diffs.push(`status: MSX88 ${expected.status}, SIM88 ${status}`);

  // `;; ignore: IP`: where a program that never ends was stopped is a
  // matter of timing.
  const ignored = new Set((meta.ignore || '').split(/\s+/).filter(Boolean));
  const regs = { ...machine.cpu.regs, IP: machine.cpu.ip };
  for (const name of ['AX', 'BX', 'CX', 'DX', 'SP', 'IP'].filter((r) => !ignored.has(r))) {
    const actual = hex4(regs[name]);
    if (actual !== expected.registers[name]) diffs.push(`${name}: MSX88 ${expected.registers[name]}, SIM88 ${actual}`);
  }
  const flags = hex4(machine.cpu.flags & VISIBLE_FLAGS);
  const expectedFlags = hex4(parseInt(expected.flags, 16) & VISIBLE_FLAGS);
  if (flags !== expectedFlags) diffs.push(`flags: MSX88 ${expectedFlags}, SIM88 ${flags}`);

  const final = initial.slice();
  for (const [address, bytes] of Object.entries(expected.memory)) {
    const start = parseInt(address, 16);
    for (let i = 0; i < bytes.length / 2; i++) final[start + i] = parseInt(bytes.slice(2 * i, 2 * i + 2), 16);
  }
  // `DB ?`: ASM88 puts in the executable whatever its buffer had (the bytes
  // the .LST shows), SIM88 leaves the memory alone. Not compared.
  const reserved = new Set(INITIAL_NOISE);
  for (const entry of program.listing) {
    entry.bytes.forEach((b, i) => b === null && reserved.add(entry.address + i));
  }
  const bad = [];
  for (let a = 0; a < USER_MEMORY_END; a++) {
    if (!reserved.has(a) && final[a] !== machine.cpu.mem[a]) bad.push(a);
  }
  if (bad.length) {
    const shown = bad.slice(0, 6).map((a) => `${hex4(a)}h: MSX88 ${hex2(final[a])}, SIM88 ${hex2(machine.cpu.mem[a])}`);
    diffs.push(`memory differs at ${bad.length} address(es): ${shown.join('; ')}`);
  }

  const out = consoleLines(machine.output);
  const want = windowOutput(expected.window);
  if (JSON.stringify(out) !== JSON.stringify(want)) {
    diffs.push(`screen: MSX88 ${JSON.stringify(want)}, SIM88 ${JSON.stringify(out)}`);
  }
  return diffs;
}

export function compareProgram({ source, meta, golden }, initial) {
  if (meta.compare === 'no') return [];
  const { diffs, program } = compareAssembler(source, golden);
  if (program && golden.run && golden.assembler.errors === 0) diffs.push(...compareRun(program, meta, golden, initial));
  return diffs;
}
