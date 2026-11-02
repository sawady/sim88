import { describe, expect, test } from 'vitest';
import { decode } from '../decoder';
import { ROWS } from '../isa';
import { assemble } from '../assembler';
import { MEMORY_SIZE } from '../cpu';

const at = (...bytes) => {
  const mem = new Uint8Array(MEMORY_SIZE);
  bytes.forEach((b, i) => {
    mem[0x2000 + i] = b;
  });
  return decode(mem, 0x2000);
};

describe('decoder', () => {
  test('MOV reg, imm (B0+r / B8+r)', () => {
    expect(at(0xb8, 0x34, 0x12)).toMatchObject({
      mnemonic: 'MOV',
      length: 3,
      size: 16,
      operands: [
        { type: 'reg', size: 16, name: 'AX' },
        { type: 'imm', size: 16, value: 0x1234 },
      ],
      text: 'MOV AX, 1234h',
    });
    expect(at(0xb4, 0xff)).toMatchObject({ length: 2, text: 'MOV AH, 0FFh' });
  });

  test('MOV reg, reg reads ModRM (8B D8 = MOV BX, AX)', () => {
    expect(at(0x8b, 0xd8)).toMatchObject({ mnemonic: 'MOV', length: 2, text: 'MOV BX, AX' });
    expect(at(0x8a, 0xc4).text).toBe('MOV AL, AH');
  });

  test('memory operands: [BX], direct, and base + displacement', () => {
    expect(at(0x8b, 0x07)).toMatchObject({
      length: 2,
      operands: [{ name: 'AX' }, { type: 'mem', size: 16, base: ['BX'], disp: 0 }],
      text: 'MOV AX, [BX]',
    });
    expect(at(0x8a, 0x06, 0x00, 0x10)).toMatchObject({ length: 4, text: 'MOV AL, [1000h]' });
    expect(at(0xc6, 0x07, 0x58)).toMatchObject({ length: 3, text: 'MOV BYTE PTR [BX], 58h' });
    expect(at(0x8a, 0x47, 0xfe).text).toBe('MOV AL, [BX - 2h]');
    expect(at(0x8b, 0x87, 0x00, 0x01).text).toBe('MOV AX, [BX + 100h]');
    expect(at(0x8b, 0x00).text).toBe('MOV AX, [BX + SI]');
  });

  test('00 is ADD r/m8, r8, as on an 8086', () => {
    expect(at(0x00, 0x00)).toMatchObject({ mnemonic: 'ADD', length: 2, text: 'ADD [BX + SI], AL' });
  });

  test('groups use the ModRM reg field (80 /4 = AND)', () => {
    expect(at(0x80, 0xe0, 0x7f).text).toBe('AND AL, 7Fh');
    expect(at(0x83, 0xc0, 0xff)).toMatchObject({ text: 'ADD AX, 0FFFFh' }); // sign extended
    expect(at(0xfe, 0xc9).text).toBe('DEC CL');
    expect(at(0xff, 0xc3).text).toBe('INC BX');
  });

  test('short forms the assembler does not emit are decoded too', () => {
    expect(at(0x40).text).toBe('INC AX');
    expect(at(0x04, 0x05).text).toBe('ADD AL, 5h');
    expect(at(0xa1, 0x00, 0x10).text).toBe('MOV AX, [1000h]');
    expect(at(0xeb, 0xfe).text).toBe('JMP 2000h');
    expect(at(0xcc).text).toBe('INT 3h');
  });

  test('relative jumps are shown with their absolute target', () => {
    expect(at(0x75, 0xfa)).toMatchObject({ mnemonic: 'JNZ', length: 2, operands: [{ type: 'rel', target: 0x1ffc }] });
    expect(at(0xe9, 0x01, 0x00).operands[0].target).toBe(0x2004);
    expect(at(0xe8, 0xfd, 0x0f).operands[0].target).toBe(0x3000);
  });

  test('zero operand instructions', () => {
    expect(at(0xf4)).toMatchObject({ mnemonic: 'HLT', length: 1, text: 'HLT' });
    expect(at(0x9c).text).toBe('PUSHF');
    expect(at(0xcd, 0x07).text).toBe('INT 7h');
  });

  test('unknown opcodes decode with a null mnemonic', () => {
    expect(at(0x0f)).toMatchObject({ mnemonic: null, length: 1, text: '?? (0Fh)' });
    expect(at(0xff, 0xff)).toMatchObject({ mnemonic: null, length: 2 }); // FF /7
  });

  test('every row the assembler emits decodes back to the same mnemonic', () => {
    const lines = [
      'MOV AX, 1', 'MOV [BX], CL', 'ADD AL, [1000h]', 'SUB WORD PTR [BX], 2', 'CMP DX, CX',
      'NEG AL', 'NOT WORD PTR [1000h]', 'INC DH', 'PUSH DX', 'POP SP', 'JMP 2000h', 'JO 2000h',
      'CALL 2000h', 'IN AX, 30h', 'OUT DX, AX', 'INT 7', 'IRET', 'STI', 'NOP', 'HLT',
    ];
    for (const line of lines) {
      const program = assemble(`ORG 2000h\n${line}\nEND`);
      const mem = new Uint8Array(MEMORY_SIZE);
      for (const [a, b] of program.memory) mem[a] = b;
      const decoded = decode(mem, 0x2000);
      expect(decoded.mnemonic).toBe(line.split(' ')[0]);
      expect(decoded.length).toBe(program.memory.size);
    }
  });

  test('the table has no duplicated opcodes', () => {
    const keys = ROWS.map((r) => `${r.opcode}/${r.ext ?? '-'}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
