import { describe, expect, test } from 'vitest';
import { parse } from '../parser';

const statements = (src) => parse(src).statements;
const body = (line) => parse(line).statements[0].body;
const operands = (line) => body(line).operands;

describe('parser: program structure', () => {
  test('one statement per line, with its line number and source', () => {
    const { statements: sts, ended } = parse('MOV AL, 1\nEND');
    expect(ended).toBe(true);
    expect(sts.map((s) => [s.line, s.body.kind])).toEqual([
      [1, 'instruction'],
      [2, 'end'],
    ]);
    expect(sts[0].source).toBe('MOV AL, 1');
  });

  test('an empty program (just END) is valid', () => {
    expect(statements('END')).toHaveLength(1);
  });

  test('everything after END is ignored', () => {
    expect(statements('MOV AL, 1\nEND this is ignored\nnot even parsed !!')).toHaveLength(2);
  });

  test('skips comments and blank lines, keeping source line numbers', () => {
    const sts = statements('; header\n\n  MOV AL, 1 ; trailing comment\nEND');
    expect(sts.map((x) => x.line)).toEqual([3, 4]);
  });

  test('accepts CRLF line endings', () => {
    expect(statements('MOV AL, 1\r\nEND\r\n')).toHaveLength(2);
  });

  test('mnemonics, registers and directives are case insensitive', () => {
    expect(body('mov al, 1')).toEqual({
      kind: 'instruction',
      mnemonic: 'MOV',
      operands: [
        { kind: 'register', name: 'AL' },
        { kind: 'number', value: 1 },
      ],
    });
    expect(body('org 1000h').kind).toBe('org');
    expect(body('dato db 1').kind).toBe('data');
  });

  test('reports syntax errors with the line', () => {
    let error;
    try {
      parse('MOV AL, 1\nMOV AL 1\nEND');
    } catch (e) {
      error = e;
    }
    expect(error.name).toBe('AsmError');
    expect(error.line).toBe(2);
    expect(error.message).toMatch(/Syntax error/);
  });
});

describe('parser: labels and definitions', () => {
  test('code labels take a colon, with or without a statement', () => {
    expect(statements('LAZO: DEC CX')[0]).toMatchObject({ label: 'LAZO', body: { mnemonic: 'DEC' } });
    expect(statements('RUTHAND:PUSH AX')[0]).toMatchObject({ label: 'RUTHAND' });
    expect(statements('FIN:')[0]).toMatchObject({ label: 'FIN', body: null });
  });

  test('data definitions: name DB/DW values', () => {
    expect(body('NUM1 DB 5')).toEqual({
      kind: 'data',
      name: 'NUM1',
      size: 8,
      values: [{ kind: 'number', value: 5 }],
    });
    expect(body('W DW ?')).toMatchObject({ size: 16, values: [{ kind: 'uninit' }] });
    expect(body('DB 1, 2')).toMatchObject({ name: null, values: [{ value: 1 }, { value: 2 }] });
  });

  test('tables, strings and DUP', () => {
    expect(body('TABLA DB 1, 2, 4, 8').values.map((v) => v.value)).toEqual([1, 2, 4, 8]);
    expect(body('MSJ DB "hola mundo", "$"').values).toEqual([
      { kind: 'string', value: 'hola mundo' },
      { kind: 'string', value: '$' },
    ]);
    expect(body('A DW 3 DUP (1234h, 0)').values[0]).toMatchObject({
      kind: 'dup',
      count: { value: 3 },
      values: [{ value: 0x1234 }, { value: 0 }],
    });
  });

  test('constants with EQU', () => {
    expect(body('PA EQU 30h')).toEqual({ kind: 'equ', name: 'PA', value: { kind: 'number', value: 0x30 } });
  });
});

describe('parser: operands', () => {
  test('decimal, negative, hexadecimal and binary literals', () => {
    expect(operands('MOV AX, 10')[1]).toEqual({ kind: 'number', value: 10 });
    expect(operands('MOV AX, -10')[1]).toEqual({ kind: 'neg', value: { kind: 'number', value: 10 } });
    expect(operands('MOV AX, 0FFh')[1]).toEqual({ kind: 'number', value: 255 });
    expect(operands('MOV AX, 1000H')[1]).toEqual({ kind: 'number', value: 4096 });
    expect(operands('MOV AL, 01111111B')[1]).toEqual({ kind: 'number', value: 127 });
  });

  test('hexadecimal literals must start with a digit (FFh is a name, as in MASM)', () => {
    expect(operands('MOV AL, FFh')[1]).toEqual({ kind: 'symbol', name: 'FFh' });
  });

  test('character literals', () => {
    expect(operands("MOV AL, 'A'")[1]).toEqual({ kind: 'number', value: 65, char: true });
  });

  test('registers, and a register does not match the prefix of a longer name', () => {
    for (const r of ['AX', 'BX', 'CX', 'DX', 'SP', 'AL', 'AH', 'BL', 'BH', 'CL', 'CH', 'DL', 'DH']) {
      expect(operands(`MOV ${r}, 1`)[0]).toEqual({ kind: 'register', name: r });
    }
    expect(operands('MOV AL, AXIS')[1]).toEqual({ kind: 'symbol', name: 'AXIS' });
  });

  test('memory operands: [BX], [address], and sizes with PTR', () => {
    expect(operands('MOV AX, [BX]')[1]).toEqual({ kind: 'memory', base: 'BX', disp: null });
    expect(operands('MOV AX, [1000h]')[1]).toEqual({
      kind: 'memory',
      base: null,
      disp: { kind: 'number', value: 0x1000 },
    });
    expect(operands('MOV WORD PTR [BX], 1006H')[0]).toEqual({
      kind: 'memory',
      base: 'BX',
      disp: null,
      ptr: 16,
    });
    expect(operands('INC BYTE PTR DATO')[0]).toEqual({ kind: 'symbol', name: 'DATO', ptr: 8 });
  });

  test('OFFSET and expressions', () => {
    expect(operands('MOV BX, OFFSET DATO')[1]).toEqual({ kind: 'offset', name: 'DATO' });
    expect(operands('MOV CL, OFFSET FIN - OFFSET DATO')[1]).toEqual({
      kind: 'binary',
      op: '-',
      left: { kind: 'offset', name: 'FIN' },
      right: { kind: 'offset', name: 'DATO' },
    });
    expect(operands('OUT PIC+1, AL')[0]).toMatchObject({ kind: 'binary', op: '+' });
  });

  test('zero operand instructions, including PUSHF and POPF', () => {
    for (const op of ['PUSHF', 'POPF', 'RET', 'IRET', 'CLI', 'STI', 'NOP', 'HLT']) {
      expect(body(op)).toEqual({ kind: 'instruction', mnemonic: op, operands: [] });
    }
  });

  test('NOT, INT, IN and OUT parse as instructions', () => {
    expect(body('NOT AX')).toMatchObject({ mnemonic: 'NOT', operands: [{ name: 'AX' }] });
    expect(body('INT 0')).toMatchObject({ mnemonic: 'INT' });
    expect(body('IN AL, DX')).toMatchObject({ mnemonic: 'IN' });
    expect(body('OUT 30h, AL')).toMatchObject({ mnemonic: 'OUT' });
  });
});
