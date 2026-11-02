// Test helpers: assemble and run programs headlessly, with the same
// fetch-decode-execute steps the UI runs (minus the timers).
import update from 'immutability-helper';

import { parse } from '../parser';
import staticCheck from '../static-checker';
import compile from '../compiler';
import { createMachine, loadProgram, start, EXECUTION_CYCLE } from '../machine';
import { MACHINE_STATES } from '../constants';
import { fromHexToInt } from '../conversions';

export const ORG = fromHexToInt('2000');

export const hex = (s) => fromHexToInt(s);

// source -> { [address]: 'XX' } (same pipeline as actions/machine.js#start)
export function assemble(source) {
  const ast = parse(source);
  staticCheck(ast);
  return compile(ORG, ast);
}

// Compiled program as a list of hex bytes, in address order.
export function bytes(source) {
  const program = assemble(source);
  return Object.keys(program)
    .map(Number)
    .sort((a, b) => a - b)
    .map((dir) => program[dir]);
}

export function loadedMachine(source) {
  let machine = createMachine();
  machine = update(machine, loadProgram(assemble(source))(machine));
  return update(machine, start());
}

// Runs until the machine stops (END or decode error).
export function run(source, { maxCycles = 1000 } = {}) {
  let machine = loadedMachine(source);
  for (let cycle = 0; cycle < maxCycles; cycle++) {
    for (const step of EXECUTION_CYCLE) {
      if (machine.state !== MACHINE_STATES.RUNNING) return machine;
      machine = update(machine, step(machine));
    }
  }
  throw new Error(`Program did not stop after ${maxCycles} cycles`);
}

export const reg = (machine, name) => machine.registers[name].value;

export const mem = (machine, dir) =>
  machine.memory.find((cell) => cell.dir === dir).value;

export const flagsOn = (machine) =>
  machine.flags.filter((f) => f.value).map((f) => f.name);
