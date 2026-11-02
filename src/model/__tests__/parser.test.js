import { describe, expect, test } from 'vitest';
import { parse } from '../parser';

const first = (src) => parse(src)[0];

describe('parser: program structure', () => {
  test('parses a minimal program terminated by END', () => {
    expect(parse('MOV AL, 1\nEND')).toEqual([
      {
        line: 1,
        type: 'MOV',
        group: 'BINARY',
        p1: { type: 'REGISTER', value: 'AL' },
        p2: { type: 'DECIMAL', value: 1 },
      },
      { line: 2, group: 'END', type: 'END' },
    ]);
  });

  test('END is mandatory', () => {
    expect(() => parse('MOV AL, 1\n')).toThrow(/end of input/);
  });

  // The grammar requires at least one statement before END.
  test.fails('an empty program (just END) is valid', () => {
    expect(parse('END')).toHaveLength(1);
  });

  test('everything after END is ignored', () => {
    expect(parse('MOV AL, 1\nEND this is ignored\nMOV AL, 2')).toHaveLength(2);
  });

  test('skips comments and blank lines, keeping source line numbers', () => {
    const ast = parse('; header\n\n  MOV AL, 1 ; trailing comment\nEND');
    expect(ast.map((x) => x.line)).toEqual([3, 4]);
  });

  test('mnemonics are case insensitive and normalized to upper case', () => {
    expect(first('mov AL, 1\nEND').type).toBe('MOV');
  });

  // BUG: registers keep the source casing ("al"), and the compiler only knows
  // upper case names, so `mov al, 1` assembles to garbage (see compiler tests).
  test.fails('register names are normalized to upper case', () => {
    expect(first('mov al, 1\nEND').p1.value).toBe('AL');
  });

  // BUG: ENDLINE is only "\n", so files saved with Windows line endings fail.
  test.fails('accepts CRLF line endings', () => {
    expect(parse('MOV AL, 1\r\nEND')).toHaveLength(2);
  });

  test('reports syntax errors with location', () => {
    let error;
    try {
      parse('MOV AL 1\nEND');
    } catch (e) {
      error = e;
    }
    expect(error.name).toBe('SyntaxError');
    expect(error.location.start.line).toBe(1);
  });
});

describe('parser: operands', () => {
  test('decimal, negative and hexadecimal literals', () => {
    expect(first('MOV AX, 10\nEND').p2).toEqual({ type: 'DECIMAL', value: 10 });
    expect(first('MOV AX, -10\nEND').p2).toEqual({ type: 'DECIMAL', value: -10 });
    expect(first('MOV AX, 0FFh\nEND').p2).toEqual({ type: 'HEXADECIMAL', value: 255 });
    expect(first('MOV AX, 1000H\nEND').p2).toEqual({ type: 'HEXADECIMAL', value: 4096 });
  });

  test('hexadecimal literals must start with a digit (FFh is a name, as in MASM)', () => {
    expect(first('MOV AL, FFh\nEND').p2).toEqual({ type: 'VARIABLE', name: 'FFh' });
  });

  test('numbers must fit in 16 bits (-32768..65535)', () => {
    expect(() => parse('MOV AX, 65536\nEND')).toThrow(/out of range/);
    expect(() => parse('MOV AX, -32769\nEND')).toThrow(/out of range/);
    expect(first('MOV AX, 65535\nEND').p2.value).toBe(65535);
  });

  test('all general purpose registers, 8 and 16 bits', () => {
    for (const r of ['AX', 'BX', 'CX', 'DX', 'AL', 'AH', 'BL', 'BH', 'CL', 'CH', 'DL', 'DH']) {
      expect(first(`MOV ${r}, 1\nEND`).p1).toEqual({ type: 'REGISTER', value: r });
    }
  });

  test('[BX] is parsed as a REGISTER operand (no distinct memory operand yet)', () => {
    expect(first('MOV AX, [BX]\nEND').p2).toEqual({ type: 'REGISTER', value: '[BX]' });
  });

  test('a name as operand is a VARIABLE reference', () => {
    expect(first('MOV AL, dato\nEND').p2).toEqual({ type: 'VARIABLE', name: 'dato' });
  });
});

describe('parser: instruction groups', () => {
  test('binary ops', () => {
    for (const op of ['MOV', 'ADD', 'ADC', 'SUB', 'SBB', 'CMP', 'AND', 'OR', 'XOR']) {
      expect(first(`${op} AX, BX\nEND`)).toMatchObject({ type: op, group: 'BINARY' });
    }
  });

  test('unary ops', () => {
    for (const op of ['NEG', 'DEC', 'INC', 'PUSH', 'POP']) {
      expect(first(`${op} AX\nEND`)).toMatchObject({ type: op, group: 'UNARY' });
    }
  });

  test('zero operand ops', () => {
    for (const op of ['RET', 'CLI', 'STI', 'NOP', 'HLT']) {
      expect(first(`${op}\nEND`)).toMatchObject({ type: op, group: 'ZOP' });
    }
  });

  // BUG: UNOP is tried before ZOP, so PUSHF/POPF parse as PUSH F / POP F.
  test.fails('PUSHF and POPF are zero operand ops', () => {
    expect(first('PUSHF\nEND')).toMatchObject({ type: 'PUSHF', group: 'ZOP' });
    expect(first('POPF\nEND')).toMatchObject({ type: 'POPF', group: 'ZOP' });
  });

  test('jumps and CALL take a label written as ":name" (lower case only)', () => {
    expect(first('JMP :fin\nEND')).toMatchObject({ type: 'JMP', label: 'fin', group: 'JMP' });
    expect(first('CALL :rutina\nEND')).toMatchObject({ type: 'CALL', group: 'JMP' });
    expect(() => parse('JMP :Fin\nEND')).toThrow();
  });

  test.todo('label definitions (`loop: INC AX`) and jumps to `loop` without the colon');

  test('variables declared with DB', () => {
    expect(first('dato DB 20h\nEND')).toEqual({
      line: 1,
      type: 'VARIABLE',
      group: 'VARIABLE',
      name: 'dato',
      vartype: 'DB',
      value: { type: 'HEXADECIMAL', value: 32 },
    });
    expect(first('dato DB ?\nEND').value).toBe('?');
  });

  test('constants declared with EQU', () => {
    expect(first('N EQU 10\nEND')).toMatchObject({
      type: 'CONSTANT',
      group: 'CONSTANT',
      name: 'N',
      value: { type: 'DECIMAL', value: 10 },
    });
  });

  test.todo('DW variables');
  test.todo('tables (`tabla DB 1, 2, 4, 8`) and strings (`msg DB "hola"`)');
  test.todo('ORG directive');
  test.todo('direct memory operands (`[1000h]`, variables as memory) and IN/OUT, INT, IRET');
});
