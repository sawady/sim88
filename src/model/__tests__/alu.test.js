import { describe, expect, test } from 'vitest';
import { add, adc, sub, sbb, cmp, and, or, xor, not, neg, inc, dec, parity } from '../alu';

// Flags that are on, as a sorted string ('CZ'), for the flags the operation defines
const on = ({ flags }) =>
  Object.entries(flags)
    .filter(([, v]) => v)
    .map(([k]) => k)
    .sort()
    .join('');

describe('ALU: addition', () => {
  test.each([
    // size, a, b, result, flags on
    [8, 0x01, 0x01, 0x02, ''],
    [8, 0xff, 0x01, 0x00, 'ACPZ'], // unsigned overflow, carry out of bit 3
    [8, 0x7f, 0x01, 0x80, 'AOS'], // signed overflow: 127 + 1
    [8, 0x80, 0x80, 0x00, 'COPZ'], // -128 + -128
    [8, 0x0f, 0x01, 0x10, 'A'],
    [8, 0x03, 0x00, 0x03, 'P'], // 0000 0011: two ones, even parity
    [16, 0xffff, 0x0001, 0x0000, 'ACPZ'],
    [16, 0x7fff, 0x0001, 0x8000, 'AOPS'],
    [16, 0x1234, 0x4321, 0x5555, 'P'],
    [16, 0x00ff, 0x0001, 0x0100, 'AP'], // parity looks at the low byte only
  ])('ADD%i %i + %i', (size, a, b, result, flags) => {
    const r = add(size, a, b);
    expect(r.result).toBe(result);
    expect(on(r)).toBe(flags);
  });

  test('ADC adds the carry', () => {
    expect(adc(16, 0x0001, 0x0001, false).result).toBe(2);
    expect(adc(8, 0x7e, 0x01, true).flags.O).toBe(true);
    expect(adc(8, 0xf0, 0x20, false)).toMatchObject({ result: 0x10, flags: { C: true } });
  });

  // MSX88: with C = 1, ADD and then INC, with the flags of the INC (C = 0).
  // Cases from tests/fidelity/alu-adc-sbb-flags, run on MSX88.
  test.each([
    [8, 0xfe, 0x01, 0x00, { C: false, Z: true, A: true, P: true }],
    [8, 0xff, 0x01, 0x01, { C: false, Z: false, A: false, P: false }],
    [8, 0xf0, 0x20, 0x11, { C: false, P: true, A: false }],
    [8, 0x7f, 0x00, 0x80, { O: true, S: true, A: true, C: false }],
    [16, 0xffff, 0x0000, 0x0000, { Z: true, A: true, P: true, C: false }],
  ])('ADC with carry, as MSX88: %i bits, %i + %i + 1 = %i', (size, a, b, result, flags) => {
    expect(adc(size, a, b, true)).toMatchObject({ result, flags });
  });
});

describe('ALU: subtraction and comparison', () => {
  test.each([
    [8, 0x05, 0x03, 0x02, ''],
    [8, 0x03, 0x05, 0xfe, 'ACS'], // borrow
    [8, 0x80, 0x01, 0x7f, 'AO'], // -128 - 1 overflows
    [8, 0x7f, 0xff, 0x80, 'COS'], // 127 - (-1) overflows
    [8, 0x10, 0x10, 0x00, 'PZ'],
    [8, 0x10, 0x01, 0x0f, 'AP'], // borrow from bit 4
    [16, 0x0000, 0x0001, 0xffff, 'ACPS'],
    [16, 0x8000, 0x0001, 0x7fff, 'AOP'],
  ])('SUB%i %i - %i', (size, a, b, result, flags) => {
    const r = sub(size, a, b);
    expect(r.result).toBe(result);
    expect(on(r)).toBe(flags);
  });

  test('SBB subtracts the carry', () => {
    expect(sbb(16, 0x0005, 0x0002, false).result).toBe(3);
    expect(sbb(8, 0x00, 0xff, false)).toMatchObject({ result: 0x01, flags: { C: true, A: true } });
  });

  // MSX88: with C = 1, SUB and then DEC, with the flags of the DEC (C = 0).
  test.each([
    [8, 0x00, 0x00, 0xff, { C: false, S: true, A: true, P: true }],
    [8, 0x00, 0xff, 0x00, { C: false, Z: true, P: true, A: false }],
    [8, 0xf0, 0x20, 0xcf, { S: true, A: true, P: true, C: false }],
    [16, 0x7fff, 0x0000, 0x7ffe, { O: false, S: false, P: false, C: false }],
  ])('SBB with carry, as MSX88: %i bits, %i - %i - 1 = %i', (size, a, b, result, flags) => {
    expect(sbb(size, a, b, true)).toMatchObject({ result, flags });
  });

  test('CMP sets the flags of the subtraction', () => {
    expect(cmp(8, 5, 5).flags.Z).toBe(true);
    expect(cmp(8, 3, 5).flags.C).toBe(true);
    expect(cmp(16, 0xfffe, 0x0001).flags).toMatchObject({ S: true, C: false, O: false });
  });
});

describe('ALU: logic', () => {
  test('AND, OR, XOR clear C, O and A', () => {
    expect(and(8, 0xf0, 0x3c)).toEqual({ result: 0x30, flags: { Z: false, S: false, P: true, C: false, O: false, A: false } });
    expect(or(8, 0x80, 0x01)).toMatchObject({ result: 0x81, flags: { S: true, P: true } });
    expect(xor(16, 0x1234, 0x1234)).toMatchObject({ result: 0, flags: { Z: true, P: true } });
    expect(and(8, 0x01, 0x01).flags.P).toBe(false);
  });

  test('NOT: the flags MSX88 leaves, whatever the operand (8 bits: Z and P; 16 bits: none)', () => {
    const eight = { C: false, O: false, S: false, A: false, Z: true, P: true };
    const sixteen = { C: false, O: false, S: false, A: false, Z: false, P: false };
    expect(not(8, 0x0f)).toEqual({ result: 0xf0, flags: eight });
    expect(not(8, 0x80)).toEqual({ result: 0x7f, flags: eight });
    expect(not(16, 0x0000)).toEqual({ result: 0xffff, flags: sixteen });
    expect(not(16, 0x1234)).toEqual({ result: 0xedcb, flags: sixteen });
  });

  test('NEG is 0 - x and sets C unless x is 0', () => {
    expect(neg(8, 0x01)).toMatchObject({ result: 0xff, flags: { C: true, S: true } });
    expect(neg(8, 0x00)).toMatchObject({ result: 0x00, flags: { C: false, Z: true } });
    expect(neg(8, 0x80)).toMatchObject({ result: 0x80, flags: { O: true, C: true } });
    expect(neg(16, 0x0002).result).toBe(0xfffe);
  });
});

describe('ALU: INC and DEC', () => {
  test('clear C, as MSX88 (the 8086 keeps it)', () => {
    expect(inc(8, 0xff).flags.C).toBe(false);
    expect(dec(8, 0x00).flags.C).toBe(false);
    expect(inc(16, 0x0000).flags.C).toBe(false);
  });

  test('wrap around and set the other flags', () => {
    expect(inc(8, 0xff)).toMatchObject({ result: 0, flags: { Z: true, A: true } });
    expect(inc(16, 0x7fff)).toMatchObject({ result: 0x8000, flags: { O: true, S: true } });
    expect(dec(8, 0x00)).toMatchObject({ result: 0xff, flags: { S: true, A: true } });
    expect(dec(8, 0x80)).toMatchObject({ result: 0x7f, flags: { O: true } });
    expect(dec(16, 0x0001)).toMatchObject({ result: 0, flags: { Z: true } });
  });
});

test('parity of the low byte', () => {
  expect(parity(0)).toBe(true);
  expect(parity(0b1)).toBe(false);
  expect(parity(0b11)).toBe(true);
  expect(parity(0xff)).toBe(true);
  expect(parity(0x100)).toBe(true); // high byte ignored
  expect(parity(0b0111_0000)).toBe(false);
});
