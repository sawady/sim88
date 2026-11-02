import { describe, expect, test } from 'vitest';
import { decode, addOperands } from '../decoder';
import { hex } from './helpers';
import Cell from '../cell';

describe('decoder', () => {
  test('decodes MOV reg16, imm16 (two operand bytes)', () => {
    expect(decode(hex('B8'))).toEqual({
      type: 'MOV',
      group: 'BINARY',
      paramSize: 2,
      p1: { type: 'REGISTER', value: 'AX' },
    });
    expect(decode(hex('BB')).p1.value).toBe('BX');
  });

  test('decodes MOV reg8, imm8 (one operand byte)', () => {
    expect(decode(hex('B4'))).toMatchObject({ paramSize: 1, p1: { value: 'AH' } });
    expect(decode(hex('B2'))).toMatchObject({ paramSize: 1, p1: { value: 'DL' } });
  });

  test('00 is END', () => {
    expect(decode(0)).toEqual({ group: 'END', type: 'END' });
  });

  test('unknown opcodes decode to ERROR', () => {
    expect(decode(hex('90'))).toEqual({ type: 'ERROR' });
  });

  // BUG: the compiler emits 8A/8B for MOV reg, reg but the decoder lacks them.
  test.fails('decodes MOV reg, reg (8B ModRM)', () => {
    expect(decode(hex('8B')).type).toBe('MOV');
  });

  test('reads a 16 bit operand little endian and as two\'s complement', () => {
    const memory = [new Cell(10, hex('FE')), new Cell(11, hex('FF'))];
    const spec = addOperands(10, memory, decode(hex('B8')));
    expect(spec.currentInstruction.$set.p2).toEqual({ type: 'HEXADECIMAL', value: hex('FFFE') });
  });

  test('reads an 8 bit operand', () => {
    const memory = [new Cell(10, hex('7F'))];
    const spec = addOperands(10, memory, decode(hex('B0')));
    expect(spec.currentInstruction.$set.p2).toEqual({ type: 'HEXADECIMAL', value: hex('7F') });
  });
});
