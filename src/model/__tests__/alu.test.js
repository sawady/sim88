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
    expect(adc(8, 0xfe, 0x01, true)).toMatchObject({ result: 0x00, flags: { C: true, Z: true } });
    expect(adc(16, 0x0001, 0x0001, false).result).toBe(2);
    expect(adc(8, 0x7e, 0x01, true).flags.O).toBe(true);
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
    expect(sbb(8, 0x00, 0x00, true)).toMatchObject({ result: 0xff, flags: { C: true } });
    expect(sbb(16, 0x0005, 0x0002, false).result).toBe(3);
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

  test('NOT changes no flag', () => {
    expect(not(8, 0x0f)).toEqual({ result: 0xf0, flags: {} });
    expect(not(16, 0x0000)).toEqual({ result: 0xffff, flags: {} });
  });

  test('NEG is 0 - x and sets C unless x is 0', () => {
    expect(neg(8, 0x01)).toMatchObject({ result: 0xff, flags: { C: true, S: true } });
    expect(neg(8, 0x00)).toMatchObject({ result: 0x00, flags: { C: false, Z: true } });
    expect(neg(8, 0x80)).toMatchObject({ result: 0x80, flags: { O: true, C: true } });
    expect(neg(16, 0x0002).result).toBe(0xfffe);
  });
});

describe('ALU: INC and DEC', () => {
  test('do not define C', () => {
    expect('C' in inc(8, 0xff).flags).toBe(false);
    expect('C' in dec(8, 0x00).flags).toBe(false);
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
