// The subset of the 8086 instruction set that SIM88 knows, as a table.
//
// The same table drives the decoder (opcode byte -> instruction) and the
// assembler (mnemonic + operands -> bytes), so adding an instruction is adding
// rows here plus its behavior in cpu.js.
//
// Operand codes (as in the Intel manuals):
//   Eb, Ew   register or memory, from the ModRM r/m field (8 / 16 bits)
//   Gb, Gw   register, from the ModRM reg field
//   Zb, Zw   register, from the low 3 bits of the opcode (B0+r, 50+r, ...)
//   Ib, Iw   immediate byte / word
//   Is       immediate byte, sign extended to 16 bits (opcode 83)
//   Ob, Ow   direct memory address, no ModRM (A0-A3)
//   Jb, Jw   relative jump target (IP relative displacement)
//   Aw       absolute jump target (MSX88's JMP and CALL)
//   AL, AX, DX   that register
//
// Row options:
//   ext      the ModRM reg field is part of the opcode (/0../7), for groups
//   asm      false: the decoder knows it, the assembler never emits it
//            (an equivalent, preferred encoding exists)
//
// The order of the rows of a mnemonic is the assembler's preference order:
// it emits the first row whose operands match. Following the listings of
// MSX88's assembler (ASM88), the assembler uses the general forms and never
// the 8086 short forms (A0-A3, accumulator immediates, 40+r INC/DEC, 83),
// which the decoder still understands.

export const REG8 = ['AL', 'CL', 'DL', 'BL', 'AH', 'CH', 'DH', 'BH'];
export const REG16 = ['AX', 'CX', 'DX', 'BX', 'SP', 'BP', 'SI', 'DI'];

// Registers the assembler accepts (MSX88 has no BP, SI, DI or segments).
export const ASM_REGISTERS = ['AX', 'BX', 'CX', 'DX', 'SP', 'AL', 'AH', 'BL', 'BH', 'CL', 'CH', 'DL', 'DH'];

export const regSize = (name) => (REG8.includes(name) ? 8 : REG16.includes(name) ? 16 : undefined);

const rows = [];
const row = (opcode, mnemonic, operands = [], options = {}) =>
  rows.push({ opcode, mnemonic, operands, ...options });

// MOV
for (let r = 0; r < 8; r++) row(0xb0 + r, 'MOV', ['Zb', 'Ib']);
for (let r = 0; r < 8; r++) row(0xb8 + r, 'MOV', ['Zw', 'Iw']);
row(0x8a, 'MOV', ['Gb', 'Eb']);
row(0x8b, 'MOV', ['Gw', 'Ew']);
row(0x88, 'MOV', ['Eb', 'Gb']);
row(0x89, 'MOV', ['Ew', 'Gw']);
row(0xc6, 'MOV', ['Eb', 'Ib'], { ext: 0 });
row(0xc7, 'MOV', ['Ew', 'Iw'], { ext: 0 });
row(0xa0, 'MOV', ['AL', 'Ob'], { asm: false });
row(0xa1, 'MOV', ['AX', 'Ow'], { asm: false });
row(0xa2, 'MOV', ['Ob', 'AL'], { asm: false });
row(0xa3, 'MOV', ['Ow', 'AX'], { asm: false });

// Arithmetic and logic with two operands: 8 opcodes each, plus the 80-83 groups.
export const ALU_OPS = ['ADD', 'OR', 'ADC', 'SBB', 'AND', 'SUB', 'XOR', 'CMP'];
ALU_OPS.forEach((mnemonic, i) => {
  const base = i * 8;
  row(base + 2, mnemonic, ['Gb', 'Eb']);
  row(base + 3, mnemonic, ['Gw', 'Ew']);
  row(base + 0, mnemonic, ['Eb', 'Gb']);
  row(base + 1, mnemonic, ['Ew', 'Gw']);
  row(0x80, mnemonic, ['Eb', 'Ib'], { ext: i });
  row(0x81, mnemonic, ['Ew', 'Iw'], { ext: i });
  row(base + 4, mnemonic, ['AL', 'Ib'], { asm: false });
  row(base + 5, mnemonic, ['AX', 'Iw'], { asm: false });
  row(0x82, mnemonic, ['Eb', 'Ib'], { ext: i, asm: false });
  row(0x83, mnemonic, ['Ew', 'Is'], { ext: i, asm: false });
});

// One operand arithmetic and logic
row(0xfe, 'INC', ['Eb'], { ext: 0 });
row(0xfe, 'DEC', ['Eb'], { ext: 1 });
row(0xff, 'INC', ['Ew'], { ext: 0 });
row(0xff, 'DEC', ['Ew'], { ext: 1 });
for (let r = 0; r < 8; r++) row(0x40 + r, 'INC', ['Zw'], { asm: false });
for (let r = 0; r < 8; r++) row(0x48 + r, 'DEC', ['Zw'], { asm: false });
row(0xf6, 'NOT', ['Eb'], { ext: 2 });
row(0xf7, 'NOT', ['Ew'], { ext: 2 });
row(0xf6, 'NEG', ['Eb'], { ext: 3 });
row(0xf7, 'NEG', ['Ew'], { ext: 3 });

// Stack. MSX88 only pushes and pops 16 bit registers.
for (let r = 0; r < 8; r++) row(0x50 + r, 'PUSH', ['Zw']);
for (let r = 0; r < 8; r++) row(0x58 + r, 'POP', ['Zw']);
row(0xff, 'PUSH', ['Ew'], { ext: 6, asm: false });
row(0x8f, 'POP', ['Ew'], { ext: 0, asm: false });
row(0x9c, 'PUSHF');
row(0x9d, 'POPF');

// Control flow. Conditional jumps only have an 8 bit displacement on the 8086.
// MSX88 only has JZ, JNZ, JS, JNS, JC, JNC, JO and JNO; the decoder knows all 16.
export const MSX88_JUMPS = ['JZ', 'JNZ', 'JS', 'JNS', 'JC', 'JNC', 'JO', 'JNO'];
export const CONDITIONAL_JUMPS = [
  'JO', 'JNO', 'JC', 'JNC', 'JZ', 'JNZ', 'JBE', 'JA',
  'JS', 'JNS', 'JP', 'JNP', 'JL', 'JGE', 'JLE', 'JG',
];
CONDITIONAL_JUMPS.forEach((mnemonic, i) =>
  row(0x70 + i, mnemonic, ['Jb'], MSX88_JUMPS.includes(mnemonic) ? {} : { asm: false })
);
// MSX88 deviates from the 8086 here: JMP (E9) and CALL (E8) carry the
// ABSOLUTE target address, as the ASM88 listings show (`E9 08 20` = JMP 2008h).
// The 2 byte short JMP (EB, relative) is only decoded.
row(0xe9, 'JMP', ['Aw']);
row(0xeb, 'JMP', ['Jb'], { asm: false });
row(0xe8, 'CALL', ['Aw']);
row(0xc3, 'RET');
row(0xc2, 'RET', ['Iw'], { asm: false });

// Interrupts
row(0xcd, 'INT', ['Ib']);
row(0xcc, 'INT', ['3'], { asm: false });
row(0xcf, 'IRET');
row(0xfa, 'CLI');
row(0xfb, 'STI');

// Input / output
row(0xe4, 'IN', ['AL', 'Ib']);
row(0xe5, 'IN', ['AX', 'Ib']);
row(0xec, 'IN', ['AL', 'DX']);
row(0xed, 'IN', ['AX', 'DX']);
row(0xe6, 'OUT', ['Ib', 'AL']);
row(0xe7, 'OUT', ['Ib', 'AX']);
row(0xee, 'OUT', ['DX', 'AL']);
row(0xef, 'OUT', ['DX', 'AX']);

// Control
// The MSX88 manual encodes NOP as 98h (CBW on an 8086). 90h, the 8086 NOP,
// is still decoded as NOP.
row(0x98, 'NOP');
row(0x90, 'NOP', [], { asm: false });
row(0xf4, 'HLT');

export const ROWS = rows;

// opcode -> row, or opcode -> [8 rows indexed by the ModRM reg field] for groups
export const OPCODES = (() => {
  const table = new Array(256).fill(null);
  for (const r of rows) {
    if (r.ext === undefined) {
      table[r.opcode] = r;
    } else {
      if (!table[r.opcode]) table[r.opcode] = { group: new Array(8).fill(null) };
      table[r.opcode].group[r.ext] = r;
    }
  }
  return table;
})();

// mnemonic -> rows the assembler may emit, in preference order
export const ASM_ROWS = rows.reduce((acc, r) => {
  if (r.asm === false) return acc;
  (acc[r.mnemonic] = acc[r.mnemonic] || []).push(r);
  return acc;
}, {});

export const MNEMONICS = Object.keys(ASM_ROWS);

export const hasModRM = (r) =>
  r.ext !== undefined || r.operands.some((o) => o[0] === 'E' || o[0] === 'G');

// ModRM r/m field for memory operands (mod != 11)
export const RM_BASES = [
  ['BX', 'SI'], ['BX', 'DI'], ['BP', 'SI'], ['BP', 'DI'],
  ['SI'], ['DI'], ['BP'], ['BX'],
];
