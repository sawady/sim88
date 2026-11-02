import { describe, expect, test } from 'vitest';
import { assemble, bytes, ORG } from './helpers';

describe('compiler: MOV encoding (8086 opcodes)', () => {
  test('MOV reg8, imm8 -> B0+r ib', () => {
    expect(bytes('MOV AL, 1\nEND')).toEqual(['B0', '01']);
    expect(bytes('MOV CL, 2\nEND')).toEqual(['B1', '02']);
    expect(bytes('MOV DL, 3\nEND')).toEqual(['B2', '03']);
    expect(bytes('MOV BL, 4\nEND')).toEqual(['B3', '04']);
    expect(bytes('MOV AH, 5\nEND')).toEqual(['B4', '05']);
    expect(bytes('MOV CH, 6\nEND')).toEqual(['B5', '06']);
    expect(bytes('MOV DH, 7\nEND')).toEqual(['B6', '07']);
    expect(bytes('MOV BH, 8\nEND')).toEqual(['B7', '08']);
  });

  test('MOV reg16, imm16 -> B8+r iw (little endian)', () => {
    expect(bytes('MOV AX, 1234h\nEND')).toEqual(['B8', '34', '12']);
    expect(bytes('MOV CX, 1\nEND')).toEqual(['B9', '01', '00']);
    expect(bytes('MOV DX, 1\nEND')).toEqual(['BA', '01', '00']);
    expect(bytes('MOV BX, 1\nEND')).toEqual(['BB', '01', '00']);
  });

  test('negative immediates are encoded in two\'s complement', () => {
    expect(bytes('MOV AX, -1\nEND')).toEqual(['B8', 'FF', 'FF']);
    expect(bytes('MOV AL, -2\nEND')).toEqual(['B0', 'FE']);
  });

  test('MOV reg, reg -> 8A/8B with ModRM 11 reg r/m', () => {
    expect(bytes('MOV BX, AX\nEND')).toEqual(['8B', 'D8']);
    expect(bytes('MOV AL, AH\nEND')).toEqual(['8A', 'C4']);
  });

  test('the program is loaded from ORG 2000h, consecutively', () => {
    expect(assemble('MOV AL, 1\nMOV AX, 2\nEND')).toEqual({
      [ORG]: 'B0',
      [ORG + 1]: '01',
      [ORG + 2]: 'B8',
      [ORG + 3]: '02',
      [ORG + 4]: '00',
    });
  });

  test('END emits no byte: execution stops on the zeroed memory that follows (opcode 00)', () => {
    expect(bytes('MOV AL, 1\nEND')).toEqual(['B0', '01']);
  });

  test('DB variables are placed inline, where they are declared', () => {
    expect(bytes('dato DB 20h\nEND')).toEqual(['20']);
    expect(bytes('MOV AL, 1\ndato DB 0FFh\nEND')).toEqual(['B0', '01', 'FF']);
  });

  // BUG: 8 bit immediates are not range checked, the high byte is dropped.
  test.fails('MOV reg8 with an immediate that does not fit in 8 bits is an error', () => {
    expect(() => assemble('MOV AL, 300\nEND')).toThrow();
  });

  test('lower case registers assemble like upper case ones', () => {
    expect(bytes('mov al, 1\nEND')).toEqual(bytes('MOV AL, 1\nEND'));
  });

  // BUG: `DB ?` crashes with a TypeError instead of reserving a byte.
  test.fails('DB ? reserves one (zeroed) byte', () => {
    expect(bytes('dato DB ?\nEND')).toEqual(['00']);
  });

  // BUG: [BX] is accepted as a register and encoded with garbage.
  test.fails('MOV AX, [BX] is rejected or encoded as indirect addressing (8B 07)', () => {
    let result;
    try {
      result = bytes('MOV AX, [BX]\nEND');
    } catch (e) {
      return;
    }
    expect(result).toEqual(['8B', '07']);
  });
});

describe('static checks and unsupported instructions', () => {
  test('MOV with a variable operand is rejected by the static checker, with line', () => {
    let error;
    try {
      assemble('MOV AL, 1\nMOV AL, dato\nEND');
    } catch (e) {
      error = e;
    }
    expect(error.message).toMatch(/Invalid params for MOV/);
    expect(error.line).toBe(2);
  });

  test('EQU, jumps and zero operand instructions are not compiled yet', () => {
    expect(() => assemble('N EQU 1\nEND')).toThrow(/Unknown group/);
    expect(() => assemble('JMP :fin\nEND')).toThrow(/Unknown group/);
    expect(() => assemble('NOP\nEND')).toThrow(/Unknown group/);
  });

  test('other binary/unary instructions crash with a TypeError', () => {
    expect(() => assemble('ADD AX, BX\nEND')).toThrow(TypeError);
    expect(() => assemble('INC AX\nEND')).toThrow(TypeError);
  });

  // BUG: should be a friendly "not implemented"/"invalid params" error with a line.
  test.fails('unsupported instructions give a friendly error with line number', () => {
    let error;
    try {
      assemble('ADD AX, BX\nEND');
    } catch (e) {
      error = e;
    }
    expect(error).not.toBeInstanceOf(TypeError);
    expect(error.line).toBe(1);
  });

  // BUG: operand sizes are not checked; MOV AL, BX is accepted.
  test.fails('MOV between registers of different size is rejected', () => {
    expect(() => assemble('MOV AL, BX\nEND')).toThrow();
  });
});
