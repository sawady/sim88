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
//
// MSX88 V-3.1 differs from the 8086 in three places of the ALU (a fourth
// difference, PUSH SP, is in cpu.js). By default SIM88 copies MSX88
// (fidelity rule; evidence in tests/fidelity: alu-adc-sbb-flags,
// alu-inc-dec-flags, alu-not-flags, run on the original MSX88):
//   - INC and DEC clear C (the 8086 leaves it alone).
//   - ADC and SBB with C = 1 are ADD / SUB followed by INC / DEC of the
//     result, and the flags are those of the INC / DEC: so C ends 0.
//   - NOT sets flags: 8 bits leave Z = P = 1 and C O S A = 0; 16 bits leave
//     the six at 0 (the 8086, and the MSX88 manual, say NOT changes none).
// The "ALU: as 8086" setting uses the 8086 versions instead (the *8086
// functions below). ALU_MODES[mode] has the operations of each mode.

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

// ADC: with C = 0 it is ADD; with C = 1, MSX88 adds and then increments.
export const adc = (size, a, b, carry) => (carry ? inc(size, add(size, a, b).result) : add(size, a, b));

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

// SBB: with C = 0 it is SUB; with C = 1, MSX88 subtracts and then decrements.
export const sbb = (size, a, b, carry) => (carry ? dec(size, sub(size, a, b).result) : sub(size, a, b));

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

// NOT: on MSX88 the flags do not depend on the operand (see above).
export const not = (size, a) => ({
  result: ~a & mask(size),
  flags: { C: false, O: false, S: false, A: false, Z: size === 8, P: size === 8 },
});

// NEG is 0 - a; C is set unless the operand was 0.
export function neg(size, a) {
  const { result, flags } = sub(size, 0, a);
  return { result, flags: { ...flags, C: a !== 0 } };
}

// INC and DEC are ADD/SUB 1 that clear C (on MSX88; see above).
export function inc(size, a) {
  const { result, flags } = add(size, a, 1);
  return { result, flags: { ...flags, C: false } };
}

export function dec(size, a) {
  const { result, flags } = sub(size, a, 1);
  return { result, flags: { ...flags, C: false } };
}

// The 8086 versions of the four operations where MSX88 differs.

// ADC / SBB: one addition (subtraction) with the carry, flags of the whole.
export const adc8086 = (size, a, b, carry) => add(size, a, b, carry ? 1 : 0);
export const sbb8086 = (size, a, b, carry) => sub(size, a, b, carry ? 1 : 0);

// INC / DEC: ADD / SUB 1 that leave C as it was (no C in the flags).
const withoutC = ({ result, flags: { C, ...flags } }) => ({ result, flags });
export const inc8086 = (size, a) => withoutC(add(size, a, 1));
export const dec8086 = (size, a) => withoutC(sub(size, a, 1));

// NOT changes no flag.
export const not8086 = (size, a) => ({ result: ~a & mask(size), flags: {} });

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

export const BINARY_8086 = { ...BINARY, ADC: adc8086, SBB: sbb8086 };
export const UNARY_8086 = { ...UNARY, INC: inc8086, DEC: dec8086, NOT: not8086 };

// 'msx88' (the default: as the original MSX88) or '8086' (as a real 8086).
export const DEFAULT_ALU_MODE = 'msx88';
export const ALU_MODES = {
  msx88: { BINARY, UNARY },
  8086: { BINARY: BINARY_8086, UNARY: UNARY_8086 },
};
