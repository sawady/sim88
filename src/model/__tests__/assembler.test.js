import { describe, expect, test } from 'vitest';
import { assemble } from '../assembler';
import { bytes, encode } from './helpers';

const errorOf = (source) => {
  try {
    assemble(source);
  } catch (e) {
    return e;
  }
  throw new Error('expected an error');
};

describe('assembler: 8086 encoding, as in the ASM88 listings', () => {
  test('MOV reg, imm -> B0+r ib / B8+r iw (little endian)', () => {
    expect(encode('MOV AL, 1')).toEqual(['B0', '01']);
    expect(encode('MOV CL, 2')).toEqual(['B1', '02']);
    expect(encode('MOV BH, 8')).toEqual(['B7', '08']);
    expect(encode('MOV AX, 1000h')).toEqual(['B8', '00', '10']);
    expect(encode('MOV BX, 1')).toEqual(['BB', '01', '00']);
    expect(encode('MOV SP, 7000h')).toEqual(['BC', '00', '70']);
  });

  test('negative and binary immediates', () => {
    expect(encode('MOV AX, -1')).toEqual(['B8', 'FF', 'FF']);
    expect(encode('MOV AL, -1')).toEqual(['B0', 'FF']);
    expect(encode('MOV AL, 01111111B')).toEqual(['B0', '7F']);
  });

  test('MOV reg, reg -> 8A/8B with ModRM 11 reg r/m', () => {
    expect(encode('MOV BX, AX')).toEqual(['8B', 'D8']);
    expect(encode('MOV AL, AH')).toEqual(['8A', 'C4']);
  });

  test('lower case source assembles like upper case', () => {
    expect(encode('mov al, 1')).toEqual(encode('MOV AL, 1'));
    expect(bytes('org 1000h\ndato db 5\norg 2000h\nmov al, DATO\nhlt\nend')).toEqual(
      bytes('ORG 1000H\nDATO DB 5\nORG 2000H\nMOV AL, dato\nHLT\nEND')
    );
  });

  test('memory operands: [BX] is mod=00 r/m=111, direct is mod=00 r/m=110 + disp16', () => {
    expect(encode('MOV AX, [BX]')).toEqual(['8B', '07']);
    expect(encode('MOV DL, [BX]')).toEqual(['8A', '17']);
    expect(encode('MOV [BX], AL')).toEqual(['88', '07']);
    expect(encode('MOV AL, [1000h]')).toEqual(['8A', '06', '00', '10']);
    expect(encode('MOV [1002h], AX')).toEqual(['89', '06', '02', '10']);
  });

  test('a data label is a direct memory operand of its size', () => {
    const src = (line) => `ORG 1000h\nB DB 5\nW DW 1234h\nORG 2000h\n${line}\nEND`;
    const code = (line) => bytes(src(line)).slice(3);
    expect(code('MOV AL, B')).toEqual(['8A', '06', '00', '10']);
    expect(code('MOV W, BX')).toEqual(['89', '1E', '01', '10']);
    expect(code('MOV W, 1234h')).toEqual(['C7', '06', '01', '10', '34', '12']);
    expect(code('MOV B, 5')).toEqual(['C6', '06', '00', '10', '05']);
    expect(code('MOV AL, B+1')).toEqual(['8A', '06', '01', '10']);
  });

  test('BYTE PTR / WORD PTR give the size of [BX]', () => {
    expect(encode('MOV WORD PTR [BX], 1006H')).toEqual(['C7', '07', '06', '10']);
    expect(encode('MOV BYTE PTR [BX], 58H')).toEqual(['C6', '07', '58']);
    expect(encode('INC WORD PTR [BX]')).toEqual(['FF', '07']);
  });

  test('arithmetic and logic use the general forms (no short forms, as ASM88)', () => {
    expect(encode('ADD AX, BX')).toEqual(['03', 'C3']);
    expect(encode('SUB CL, DL')).toEqual(['2A', 'CA']);
    expect(encode('AND AL, 7Fh')).toEqual(['80', 'E0', '7F']);
    expect(encode('ADD BX, 6')).toEqual(['81', 'C3', '06', '00']);
    expect(encode('ADD AX, 1')).toEqual(['81', 'C0', '01', '00']);
    expect(encode('CMP AL, AH')).toEqual(['3A', 'C4']);
    expect(encode('XOR [BX], AL')).toEqual(['30', '07']);
    expect(encode('OR AL, [BX]')).toEqual(['0A', '07']);
    expect(encode('ADC DX, 0')).toEqual(['81', 'D2', '00', '00']);
    expect(encode('SBB AL, 1')).toEqual(['80', 'D8', '01']);
  });

  test('one operand instructions', () => {
    expect(encode('INC BX')).toEqual(['FF', 'C3']);
    expect(encode('DEC CL')).toEqual(['FE', 'C9']);
    expect(encode('NOT AX')).toEqual(['F7', 'D0']);
    expect(encode('NEG BYTE PTR [BX]')).toEqual(['F6', '1F']);
    expect(encode('NOT BYTE PTR [1000h]')).toEqual(['F6', '16', '00', '10']);
  });

  test('stack, control and interrupts', () => {
    expect(encode('PUSH AX')).toEqual(['50']);
    expect(encode('POP BX')).toEqual(['5B']);
    expect(encode('PUSHF')).toEqual(['9C']);
    expect(encode('POPF')).toEqual(['9D']);
    expect(encode('RET')).toEqual(['C3']);
    expect(encode('INT 0')).toEqual(['CD', '00']);
    expect(encode('INT 3')).toEqual(['CD', '03']);
    expect(encode('IRET')).toEqual(['CF']);
    expect(encode('CLI')).toEqual(['FA']);
    expect(encode('STI')).toEqual(['FB']);
    expect(encode('NOP')).toEqual(['90']); // ASM88 (the manual says 98h)
    expect(encode('HLT')).toEqual(['F4']);
  });

  test('IN and OUT', () => {
    expect(encode('IN AL, 30h')).toEqual(['E4', '30']);
    expect(encode('IN AX, DX')).toEqual(['ED']);
    expect(encode('OUT 31h, AL')).toEqual(['E6', '31']);
    expect(encode('OUT DX, AL')).toEqual(['EE']);
    expect(bytes('PB EQU 31h\nORG 2000h\nOUT PB, AL\nEND')).toEqual(['E6', '31']);
  });

  test('Jcc are IP relative (rel8); JMP and CALL carry the absolute address, as ASM88', () => {
    // SUMA: INC AL / CMP AL, AH / JNZ SUMA: 6 bytes back from the next instruction
    expect(bytes('ORG 2000h\nSUMA: INC AL\nCMP AL, AH\nJNZ SUMA\nEND')).toEqual([
      'FE', 'C0', '3A', 'C4', '75', 'FA',
    ]);
    expect(bytes('ORG 2000h\nJZ FIN\nNOP\nFIN: HLT\nEND')).toEqual(['74', '01', '90', 'F4']);
    // POLL at 2008h: `200C E9 08 20  JMP POLL` in the UNLP listings
    expect(bytes('ORG 2000h\nMOV AX, 1\nMOV BX, 1\nNOP\nNOP\nPOLL: NOP\nNOP\nNOP\nNOP\nJMP POLL\nEND').slice(-3)).toEqual([
      'E9', '08', '20',
    ]);
    expect(bytes('ORG 2000h\nJMP FIN\nNOP\nFIN: HLT\nEND')).toEqual(['E9', '04', '20', '90', 'F4']);
    expect(bytes('ORG 2000h\nCALL RUT\nHLT\nORG 3000h\nRUT: RET\nEND')).toEqual([
      'E8', '00', '30', 'F4', 'C3',
    ]);
  });

  test('a conditional jump out of range is an error', () => {
    const far = `ORG 2000h\nJZ FIN\n${'NOP\n'.repeat(128)}FIN: HLT\nEND`;
    expect(errorOf(far)).toMatchObject({ line: 2, message: expect.stringMatching(/cannot reach/) });
    const near = `ORG 2000h\nJZ FIN\n${'NOP\n'.repeat(127)}FIN: HLT\nEND`;
    expect(() => assemble(near)).not.toThrow();
  });
});

describe('assembler: directives', () => {
  test('ORG places code and data in separate areas; execution starts at 2000h', () => {
    const program = assemble('ORG 1000h\nDATO DB 7\nORG 2000h\nMOV AL, DATO\nHLT\nEND');
    expect(program.entry).toBe(0x2000);
    expect(program.memory.get(0x1000)).toBe(7);
    expect(program.memory.get(0x2000)).toBe(0x8a);
    expect(program.symbols.DATO).toMatchObject({ kind: 'data', value: 0x1000, size: 8 });
  });

  test('code without ORG starts at 2000h', () => {
    expect(assemble('MOV AL, 1\nHLT\nEND').memory.get(0x2000)).toBe(0xb0);
  });

  test('ORG accepts decimal values and constants', () => {
    const program = assemble('N EQU 1000h\nORG N\nDB 1\nORG 2000h\nHLT\nEND');
    expect(program.memory.get(0x1000)).toBe(1);
    expect(assemble('ORG 40\nDB 1\nORG 2000h\nHLT\nEND').memory.get(40)).toBe(1);
  });

  test('overlapping ORG blocks are an error', () => {
    const error = errorOf('ORG 2000h\nMOV AX, 1\nORG 2001h\nNOP\nEND');
    expect(error.line).toBe(4);
    expect(error.message).toMatch(/overlaps with line 2/);
  });

  test('an error when there is code but nothing at 2000h', () => {
    expect(errorOf('ORG 1000h\nDATO DB 1\nMOV AL, DATO\nEND').message).toMatch(/no instruction there/);
  });

  test('DB ? and DW ? reserve memory without writing it', () => {
    const program = assemble('ORG 1000h\nA DB ?\nB DW ?\nC DB 1\nORG 2000h\nHLT\nEND');
    expect(program.symbols.B.value).toBe(0x1001);
    expect(program.symbols.C.value).toBe(0x1003);
    expect(program.memory.has(0x1000)).toBe(false);
  });

  test('DW is little endian; tables and strings', () => {
    expect(bytes('W DW 1234h, -1\nEND')).toEqual(['34', '12', 'FF', 'FF']);
    expect(bytes('T DB 1, 2, 4, 8\nEND')).toEqual(['01', '02', '04', '08']);
    expect(bytes('MSJ DB "Hola", 0\nEND')).toEqual(['48', '6F', '6C', '61', '00']);
    expect(bytes('A DW 2 DUP (1234h, 1)\nEND')).toEqual(['34', '12', '01', '00', '34', '12', '01', '00']);
  });

  test('DW with a label stores its address (interrupt vectors)', () => {
    expect(bytes('ORG 2000h\nRUT: IRET\nORG 40\nIP_RUT DW RUT\nEND')).toEqual(['CF', '00', '20']);
  });

  test('EQU constants are immediates and take no memory', () => {
    expect(bytes('N EQU 5\nORG 2000h\nMOV AL, N\nMOV CX, N*2+1\nEND')).toEqual([
      'B0', '05', 'B9', '0B', '00',
    ]);
  });

  test('OFFSET gives the address of a label, as an immediate', () => {
    const src = 'ORG 1000h\nDATO DB "hola mundo"\nFIN DB ?\nORG 2000h\nMOV BX, OFFSET DATO\nMOV CL, OFFSET FIN - OFFSET DATO\nEND';
    expect(bytes(src).slice(10)).toEqual(['BB', '00', '10', 'B1', '0A']);
  });

  test('END is mandatory', () => {
    expect(errorOf('MOV AL, 1').message).toMatch(/END is missing/);
  });
});

describe('assembler: errors are friendly and have the line', () => {
  const cases = [
    ['MOVE AL, 1', /Unknown instruction MOVE/],
    ['MOV AL, 300', /does not fit in 8 bits/],
    ['MOV AL, -129', /does not fit in 8 bits/],
    ['MOV AL, BX', /size mismatch: AL is 8 bits and BX is 16 bits/],
    ['MOV AL', /MOV takes 2 operands, not 1/],
    ['MOV [BX], 5', /BYTE PTR or WORD PTR/],
    ['INC [BX]', /BYTE PTR or WORD PTR/],
    ['MOV [BX], [1000h]', /memory to memory/],
    ['MOV AL, NADA', /NADA is not defined/],
    ['MOV 5, AL', /Invalid operands for MOV: immediate, AL/],
    ['PUSH AL', /Invalid operands for PUSH/],
    ['PUSH [BX]', /Invalid operands for PUSH|BYTE PTR/],
    ['MOV AX, [BX+2]', /only supports \[BX\]/],
    ['INT 256', /not a valid interrupt number/],
    ['MOV AL, 1 2', /Syntax error/],
  ];
  test.each(cases)('%s', (line, message) => {
    const error = errorOf(`ORG 2000h\n${line}\nEND`);
    expect(error.name).toBe('AsmError');
    expect(error.message).toMatch(message);
    expect(error.line).toBe(2);
  });

  test('duplicate and reserved names', () => {
    expect(errorOf('A DB 1\nA DB 2\nEND')).toMatchObject({ line: 2, message: expect.stringMatching(/already defined \(line 1\)/) });
    expect(errorOf('AX DB 1\nEND').message).toMatch(/register name/);
    expect(errorOf('MOV: NOP\nEND').message).toMatch(/reserved word/);
  });

  test('symbols are case insensitive', () => {
    expect(() => assemble('ORG 1000h\ndato DB 1\nORG 2000h\nMOV AL, DATO\nEND')).not.toThrow();
  });
});

describe('assembler: MSX88 strict mode', () => {
  const strict = (source) => assemble(source, { strict: true });
  const strictError = (line) => {
    try {
      strict(`ORG 1000h\nV DB 1\nORG 2000h\n${line}\nEND`);
    } catch (e) {
      return e;
    }
    throw new Error('expected an error');
  };

  test.each([
    ["MOV AL, 'A'", /Character literals/],
    ['MOV AL, [1000h]', /Direct addresses in brackets/],
    ['MOV AX, 2 * 3', /"\*" in expressions/],
    ['MOV AX, 6 / 3', /"\/" in expressions/],
    ["X DB 'hola'", /Single-quoted strings/],
  ])('rejects the SIM88 extension %s', (line, message) => {
    const error = strictError(line);
    expect(error.message).toMatch(message);
    expect(error.message).toMatch(/MSX88 strict mode/);
    expect(error.line).toBe(4);
  });

  test('accepts the MSX88 dialect', () => {
    expect(() =>
      strict('ORG 1000h\nMSJ DB "hola", 0\nFIN DB ?\nORG 2000h\nMOV BX, OFFSET MSJ\nMOV CL, OFFSET FIN - OFFSET MSJ\nMOV AL, [BX]\nMOV AL, MSJ+1\nHLT\nEND')
    ).not.toThrow();
  });

  test('the extensions work outside strict mode', () => {
    expect(() => assemble("ORG 2000h\nMOV AL, 'A'\nMOV AL, [1000h]\nMOV AX, 2 * 3\nEND")).not.toThrow();
  });
});

describe('assembler: line map and listing', () => {
  test('maps the address of every instruction to its line', () => {
    const program = assemble('ORG 1000h\nN DB 1\nORG 2000h\nMOV AL, N\n\nHLT\nEND');
    expect([...program.lines]).toEqual([
      [0x2000, 4],
      [0x2004, 6],
    ]);
    expect(program.listing.map((l) => [l.line, l.address])).toEqual([
      [2, 0x1000],
      [4, 0x2000],
      [6, 0x2004],
    ]);
  });
});
