// Pure 8 / 16 bit ALU.
//
// Every operation takes unsigned operands (0..FFh or 0..FFFFh) and returns
// { result, flags }, where flags holds only the flags the operation defines:
//
//   C  carry: unsigned overflow (borrow in subtractions)
//   Z  zero
//   S  sign: copy of the most significant bit of the result
//   O  overflow: signed overflow
//   A  auxiliary carry: carry (or borrow) out of bit 3, used for BCD
//   P  parity: 1 when the low byte of the result has an even number of ones
//
// Flags the 8086 leaves undefined (A after AND/OR/XOR) are set to 0.

const mask = (size) => (size === 8 ? 0xff : 0xffff);
const signBit = (size) => (size === 8 ? 0x80 : 0x8000);

export function parity(value) {
  let v = value & 0xff;
  let ones = 0;
  while (v) {
    ones += v & 1;
    v >>= 1;
  }
  return ones % 2 === 0;
}

// Z, S and P of a result
function resultFlags(result, size) {
  return {
    Z: result === 0,
    S: (result & signBit(size)) !== 0,
    P: parity(result),
  };
}

export function add(size, a, b, carryIn = 0) {
  const raw = a + b + carryIn;
  const result = raw & mask(size);
  return {
    result,
    flags: {
      ...resultFlags(result, size),
      C: raw > mask(size),
      O: ((a ^ result) & (b ^ result) & signBit(size)) !== 0,
      A: ((a ^ b ^ result) & 0x10) !== 0,
    },
  };
}

export const adc = (size, a, b, carry) => add(size, a, b, carry ? 1 : 0);

export function sub(size, a, b, borrowIn = 0) {
  const raw = a - b - borrowIn;
  const result = raw & mask(size);
  return {
    result,
    flags: {
      ...resultFlags(result, size),
      C: raw < 0,
      O: ((a ^ b) & (a ^ result) & signBit(size)) !== 0,
      A: ((a ^ b ^ result) & 0x10) !== 0,
    },
  };
}

export const sbb = (size, a, b, carry) => sub(size, a, b, carry ? 1 : 0);

// CMP computes a - b only for the flags; the caller discards the result.
export const cmp = (size, a, b) => sub(size, a, b);

function logic(size, result) {
  return {
    result,
    flags: { ...resultFlags(result, size), C: false, O: false, A: false },
  };
}

export const and = (size, a, b) => logic(size, a & b);
export const or = (size, a, b) => logic(size, a | b);
export const xor = (size, a, b) => logic(size, a ^ b);

// NOT changes no flag.
export const not = (size, a) => ({ result: ~a & mask(size), flags: {} });

// NEG is 0 - a; C is set unless the operand was 0.
export function neg(size, a) {
  const { result, flags } = sub(size, 0, a);
  return { result, flags: { ...flags, C: a !== 0 } };
}

// INC and DEC are ADD/SUB 1 that leave C untouched.
export function inc(size, a) {
  const { result, flags } = add(size, a, 1);
  const { C, ...rest } = flags;
  return { result, flags: rest };
}

export function dec(size, a) {
  const { result, flags } = sub(size, a, 1);
  const { C, ...rest } = flags;
  return { result, flags: rest };
}

// Two operand operations by mnemonic. `carry` is the current C flag.
export const BINARY = {
  ADD: (size, a, b) => add(size, a, b),
  ADC: (size, a, b, carry) => adc(size, a, b, carry),
  SUB: (size, a, b) => sub(size, a, b),
  SBB: (size, a, b, carry) => sbb(size, a, b, carry),
  CMP: (size, a, b) => cmp(size, a, b),
  AND: (size, a, b) => and(size, a, b),
  OR: (size, a, b) => or(size, a, b),
  XOR: (size, a, b) => xor(size, a, b),
};

export const UNARY = { INC: inc, DEC: dec, NEG: neg, NOT: not };
