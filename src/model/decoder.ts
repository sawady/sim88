// Table-driven 8086 decoder: reads one instruction from memory.
//
// decode(mem, address) -> {
//   address, length, bytes,       where it is and its encoding
//   opcode, mnemonic,             mnemonic is null for an unknown opcode
//   operands: [operand],          see below
//   size,                         8 or 16 (operand size), when it applies
//   text,                         'MOV AL, [BX]', for the UI
// }
//
// Operands:
//   { type: 'reg', size, name }
//   { type: 'mem', size, base: ['BX'], disp }   effective address = sum(base) + disp
//   { type: 'imm', size, value }                value is unsigned (0..FFh / 0..FFFFh)
//   { type: 'rel', target }                     absolute target of a jump

import { OPCODES, REG8, REG16, RM_BASES, hasModRM } from './isa';
import type { Row } from './isa';
import { asmHex, toSigned } from './format';
import type { Size } from './alu';

export interface RegOperand {
  type: 'reg';
  size: Size;
  name: string;
}
export interface MemOperand {
  type: 'mem';
  size: Size;
  base: string[];
  disp: number;
}
export interface ImmOperand {
  type: 'imm';
  size: Size;
  value: number;
}
export interface RelOperand {
  type: 'rel';
  target: number;
}
export type Operand = RegOperand | MemOperand | ImmOperand | RelOperand;

export interface Instruction {
  address: number;
  length: number;
  bytes: number[];
  opcode: number;
  mnemonic: string | null;
  operands: Operand[];
  size?: Size;
  text: string;
}

type Mem = ArrayLike<number>;
interface ModRM {
  mod: number;
  reg: number;
  rm: number;
}

const byteAt = (mem: Mem, address: number): number => mem[address & 0xffff];

const sizeOf = (code: string): Size => (code.endsWith('b') ? 8 : 16);

const register = (size: Size, index: number): RegOperand => ({
  type: 'reg',
  size,
  name: size === 8 ? REG8[index] : REG16[index],
});

export function decode(mem: Mem, address: number): Instruction {
  let cursor = address;
  const next = () => byteAt(mem, cursor++);
  const nextWord = () => next() | (next() << 8);

  const opcode = next();
  const found = OPCODES[opcode];
  let entry: Row | null = null;
  let modrm: ModRM | null = null;

  if (found && 'group' in found) {
    modrm = parseModRM(next());
    entry = found.group[modrm.reg];
  } else if (found) {
    entry = found;
    if (hasModRM(found)) modrm = parseModRM(next());
  }

  // The SX88 reaches memory only directly (mod 00, r/m 110) or through BX
  // (mod 00, r/m 111). MSX88 does not recognize any other ModRM memory mode,
  // like 00 00 (ADD [BX+SI], AL on an 8086): it stops with "código 0 no
  // reconocido" (the ModRM byte) and IP after the ModRM byte
  // (tests/fidelity: opcode-00, modrm-bx-disp, modrm-si).
  const sx88Mode = !modrm || modrm.mod === 3 || (modrm.mod === 0 && modrm.rm >= 6);
  if (!entry || !sx88Mode) {
    const length = modrm ? 2 : 1;
    return finish(mem, address, length, {
      opcode,
      mnemonic: null,
      operands: [],
      text: `?? (${asmHex(opcode)})`,
    });
  }

  // The displacement follows ModRM and comes before any immediate.
  let memOperand: { base: string[]; disp: number } | null = null;
  if (modrm && modrm.mod !== 3) {
    let disp = 0;
    let base = RM_BASES[modrm.rm];
    if (modrm.mod === 0 && modrm.rm === 6) {
      base = [];
      disp = nextWord();
    } else if (modrm.mod === 1) {
      disp = toSigned(next(), 8);
    } else if (modrm.mod === 2) {
      disp = nextWord();
    }
    memOperand = { base, disp };
  }

  const operands = entry.operands.map((code): Operand => {
    switch (code) {
      case 'Eb':
      case 'Ew':
        return memOperand
          ? { type: 'mem', size: sizeOf(code), ...memOperand }
          : register(sizeOf(code), modrm!.rm);
      case 'Gb':
      case 'Gw':
        return register(sizeOf(code), modrm!.reg);
      case 'Zb':
      case 'Zw':
        return register(sizeOf(code), opcode & 7);
      case 'Ib':
        return { type: 'imm', size: 8, value: next() };
      case 'Iw':
        return { type: 'imm', size: 16, value: nextWord() };
      case 'Is':
        return { type: 'imm', size: 16, value: toSigned(next(), 8) & 0xffff };
      case 'Ob':
      case 'Ow':
        return { type: 'mem', size: sizeOf(code), base: [], disp: nextWord() };
      case 'Jb': {
        const rel = toSigned(next(), 8);
        return { type: 'rel', target: (cursor + rel) & 0xffff };
      }
      case 'Jw': {
        const rel = nextWord();
        return { type: 'rel', target: (cursor + rel) & 0xffff };
      }
      case 'Aw':
        return { type: 'rel', target: nextWord() };
      case 'AL':
        return register(8, 0);
      case 'AX':
        return register(16, 0);
      case 'DX':
        return register(16, 2);
      case '3':
        return { type: 'imm', size: 8, value: 3 };
      default:
        throw new Error(`Unknown operand code ${code}`);
    }
  });

  // Operand size: from the first operand that has one (IN/OUT use the
  // accumulator, which is never the port).
  const sized = operands.find((o): o is RegOperand | MemOperand => o.type === 'reg' || o.type === 'mem');
  const size = entry.mnemonic === 'OUT' ? (operands[1] as RegOperand).size : sized ? sized.size : undefined;

  return finish(mem, address, cursor - address, {
    opcode,
    mnemonic: entry.mnemonic,
    operands,
    size,
    text: formatInstruction(entry.mnemonic, operands),
  });
}

function parseModRM(byte: number): ModRM {
  return { mod: byte >> 6, reg: (byte >> 3) & 7, rm: byte & 7 };
}

function finish(
  mem: Mem,
  address: number,
  length: number,
  instruction: Omit<Instruction, 'address' | 'length' | 'bytes'>
): Instruction {
  const bytes: number[] = [];
  for (let i = 0; i < length; i++) bytes.push(byteAt(mem, address + i));
  return { address, length, bytes, ...instruction };
}

export function formatOperand(operand: Operand, { withSize = false } = {}): string {
  switch (operand.type) {
    case 'reg':
      return operand.name;
    case 'imm':
      return asmHex(operand.value);
    case 'rel':
      return asmHex(operand.target);
    case 'mem': {
      const parts = [...operand.base];
      if (operand.disp || parts.length === 0) {
        const disp = parts.length ? toSigned(operand.disp & 0xffff, 16) : operand.disp;
        if (parts.length && disp < 0) {
          parts.push(`- ${asmHex(-disp)}`);
        } else {
          parts.push(asmHex(disp & 0xffff));
        }
      }
      const inner = parts.join(' + ').replace('+ -', '-');
      const prefix = withSize ? `${operand.size === 8 ? 'BYTE' : 'WORD'} PTR ` : '';
      return `${prefix}[${inner}]`;
    }
    default:
      return '?';
  }
}

export function formatInstruction(mnemonic: string, operands: Operand[]): string {
  // A memory operand needs its size spelled out when no register gives it away.
  const needsSize = !operands.some((o) => o.type === 'reg');
  const text = operands.map((o) => formatOperand(o, { withSize: needsSize })).join(', ');
  return text ? `${mnemonic} ${text}` : mnemonic;
}
