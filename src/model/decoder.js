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
import { asmHex, toSigned } from './format';

const byteAt = (mem, address) => mem[address & 0xffff];

const sizeOf = (code) => (code.endsWith('b') ? 8 : 16);

const register = (size, index) => ({
  type: 'reg',
  size,
  name: size === 8 ? REG8[index] : REG16[index],
});

export function decode(mem, address) {
  let cursor = address;
  const next = () => byteAt(mem, cursor++);
  const nextWord = () => next() | (next() << 8);

  const opcode = next();
  let entry = OPCODES[opcode];
  let modrm = null;

  if (entry && entry.group) {
    modrm = parseModRM(next());
    entry = entry.group[modrm.reg];
  } else if (entry && hasModRM(entry)) {
    modrm = parseModRM(next());
  }

  if (!entry) {
    const length = modrm ? 2 : 1;
    return finish(mem, address, length, {
      opcode,
      mnemonic: null,
      operands: [],
      text: `?? (${asmHex(opcode)})`,
    });
  }

  // The displacement follows ModRM and comes before any immediate.
  let memOperand = null;
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

  const operands = entry.operands.map((code) => {
    switch (code) {
      case 'Eb':
      case 'Ew':
        return memOperand
          ? { type: 'mem', size: sizeOf(code), ...memOperand }
          : register(sizeOf(code), modrm.rm);
      case 'Gb':
      case 'Gw':
        return register(sizeOf(code), modrm.reg);
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
  const sized = operands.find((o) => o.type === 'reg' || o.type === 'mem');
  const size = entry.mnemonic === 'OUT' ? operands[1].size : sized ? sized.size : undefined;

  return finish(mem, address, cursor - address, {
    opcode,
    mnemonic: entry.mnemonic,
    operands,
    size,
    text: formatInstruction(entry.mnemonic, operands),
  });
}

function parseModRM(byte) {
  return { mod: byte >> 6, reg: (byte >> 3) & 7, rm: byte & 7 };
}

function finish(mem, address, length, instruction) {
  const bytes = [];
  for (let i = 0; i < length; i++) bytes.push(byteAt(mem, address + i));
  return { address, length, bytes, ...instruction };
}

export function formatOperand(operand, { withSize = false } = {}) {
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

export function formatInstruction(mnemonic, operands) {
  // A memory operand needs its size spelled out when no register gives it away.
  const needsSize = !operands.some((o) => o.type === 'reg');
  const text = operands.map((o) => formatOperand(o, { withSize: needsSize })).join(', ');
  return text ? `${mnemonic} ${text}` : mnemonic;
}
