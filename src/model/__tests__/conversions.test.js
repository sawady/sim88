import { describe, expect, test } from 'vitest';
import {
  toHex8,
  toHex16,
  fromBinToHex8,
  fromReg,
  toOperand,
  fromHexTo2CInt,
  forRegLowPart,
  forRegHighPart,
} from '../conversions';
import { hex } from './helpers';

describe('conversions', () => {
  test('two\'s complement hex', () => {
    expect(toHex8(-1)).toBe('FF');
    expect(toHex8(5)).toBe('05');
    expect(toHex16(-1)).toBe('FFFF');
    expect(toHex16(hex('ABC'))).toBe('0ABC');
  });

  test('binary string to hex byte', () => {
    expect(fromBinToHex8('10111000')).toBe('B8');
  });

  test('fromReg splits high/low bytes', () => {
    expect(fromReg('AX', hex('1234'))).toEqual({ name: 'AX', H: '12', L: '34' });
  });

  // Note: in toOperand, "L" is the most significant byte and "H" the least
  // significant one (the names are swapped with respect to fromReg).
  test('toOperand returns the bytes with swapped names', () => {
    expect(toOperand(hex('1234'))).toEqual({ L: '12', H: '34' });
  });

  test('fromHexTo2CInt reads 16 bit hex', () => {
    expect(fromHexTo2CInt('FFFF')).toBe(hex('FFFF'));
    expect(fromHexTo2CInt('0010')).toBe(16);
  });

  test('replacing the low / high byte of a 16 bit value', () => {
    expect(forRegLowPart(hex('1234'), hex('FF'))).toBe(hex('12FF'));
    expect(forRegHighPart(hex('1234'), hex('FF'))).toBe(hex('FF34'));
    expect(forRegLowPart(hex('1234'), -1)).toBe(hex('12FF'));
  });
});
