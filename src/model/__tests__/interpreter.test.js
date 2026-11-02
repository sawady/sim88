import { describe, expect, test } from 'vitest';
import update from 'immutability-helper';

import { execute } from '../interpreter';
import { createMachine } from '../machine';
import { run, reg, mem, flagsOn, hex, ORG } from './helpers';

describe('machine: initial state', () => {
  test('IP starts at 2000h and memory spans 2000h..23E8h', () => {
    const m = createMachine();
    expect(m.IP.value).toBe(ORG);
    expect(m.memory[0].dir).toBe(ORG);
    expect(m.memory[m.memory.length - 1].dir).toBe(ORG + 1000);
    expect(m.state).toBe('STOPPED');
  });

  // BUG/leftover: createMachine initializes every register with 10 (000Ah).
  test('registers currently start at 000Ah', () => {
    expect(reg(createMachine(), 'AX')).toBe(10);
  });

  test.fails('registers start at 0', () => {
    expect(reg(createMachine(), 'AX')).toBe(0);
  });
});

describe('interpreter: running programs', () => {
  test('MOV to 8 bit halves composes the 16 bit register', () => {
    const m = run('MOV AL, 1\nMOV AH, 2\nEND');
    expect(reg(m, 'AX')).toBe(hex('0201'));
    expect(m.state).toBe('STOPPED');
  });

  test('MOV reg16, imm16 for every register', () => {
    const m = run('MOV AX, 1111h\nMOV BX, 2222h\nMOV CX, 3333h\nMOV DX, 4444h\nEND');
    expect([reg(m, 'AX'), reg(m, 'BX'), reg(m, 'CX'), reg(m, 'DX')]).toEqual([
      hex('1111'),
      hex('2222'),
      hex('3333'),
      hex('4444'),
    ]);
  });

  test('writing a low half keeps the high half (and vice versa)', () => {
    const m = run('MOV BX, 1234h\nMOV BL, 0FFh\nMOV CX, 1234h\nMOV CH, 0\nEND');
    expect(reg(m, 'BX')).toBe(hex('12FF'));
    expect(reg(m, 'CX')).toBe(hex('0034'));
  });

  test('negative immediates end up in two\'s complement', () => {
    const m = run('MOV DX, -2\nMOV CL, -1\nEND');
    expect(reg(m, 'DX')).toBe(hex('FFFE'));
    expect(reg(m, 'CX') & 0xff).toBe(hex('FF'));
  });

  test('the program is in memory and IP ends right after the END opcode', () => {
    const m = run('MOV AX, 1234h\nEND');
    expect([mem(m, ORG), mem(m, ORG + 1), mem(m, ORG + 2)]).toEqual([hex('B8'), hex('34'), hex('12')]);
    expect(m.IP.value).toBe(ORG + 4);
    expect(m.decoder).toBe('????');
  });

  test('an unknown opcode stops the machine with the decoder showing ERROR', () => {
    // the DB byte is placed inline and executed as code
    const m = run('dato DB 90h\nEND');
    expect(m.state).toBe('STOPPED');
    expect(m.decoder).toBe('ERROR');
  });

  test('flags are never modified (there is no ALU yet)', () => {
    expect(flagsOn(run('MOV AX, 0\nMOV AL, -1\nEND'))).toEqual([]);
  });

  // BUG: MOV reg, reg compiles to 8B but cannot be decoded, so execution stops.
  test.fails('MOV BX, AX copies AX into BX', () => {
    const m = run('MOV AX, 1234h\nMOV BX, AX\nEND');
    expect(m.decoder).not.toBe('ERROR');
    expect(reg(m, 'BX')).toBe(hex('1234'));
  });
});

describe('interpreter: execute() on decoded instructions', () => {
  const machineWith = (regs) => {
    const m = createMachine();
    return update(m, {
      registers: Object.fromEntries(
        Object.entries(regs).map(([r, v]) => [r, { value: { $set: v } }])
      ),
    });
  };
  const movRegReg = (dst, src) => ({
    type: 'MOV',
    group: 'BINARY',
    p1: { type: 'REGISTER', value: dst },
    p2: { type: 'REGISTER', value: src },
  });
  const exec = (m, inst) => update(m, execute(m, inst));

  test('MOV reg16, reg16', () => {
    const m = exec(machineWith({ AX: hex('1234') }), movRegReg('BX', 'AX'));
    expect(reg(m, 'BX')).toBe(hex('1234'));
  });

  test('MOV between 8 bit halves', () => {
    const m = machineWith({ AX: hex('12AB'), BX: hex('0000') });
    expect(reg(exec(m, movRegReg('BH', 'AL')), 'BX')).toBe(hex('AB00'));
    expect(reg(exec(m, movRegReg('BL', 'AH')), 'BX')).toBe(hex('0012'));
  });

  test('marks the registers involved as active components (for the UI)', () => {
    const m = exec(machineWith({ AX: 1 }), movRegReg('BX', 'AX'));
    expect(m.activeComponents).toEqual(['BX', 'AX']);
  });
});
