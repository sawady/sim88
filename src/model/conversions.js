import {
  REGISTERS,
  LOW_REGISTERS,
  HIGH_REGISTERS,
} from './constants';

// Converts a signed decimal to hex encoded with two's complement
// (almost black magic)
const toCA2 = (size) => {
  if (size < 2) {
    throw new Error('Minimum size is 2');
  }
  else if (size > 64) {
    throw new Error('Maximum size is 64');
  }
  // Determine value range
  return (value) => {
    if (value < 0) {
      return (1 << size) + value;
    }
    else {
      return value;
    }
  };
}

const toInt8 = toCA2(8);
const toInt16 = toCA2(16);

// converts an int to two's complement hex string of size 2 (in CA2)
export const toHex8 = (number) => (
  printHex8(toInt8(number))
);

// converts an int to two's complement hex string ofsize 4 (in CA2)
export const toHex16 = (number) => (
  printHex16(toInt16(number))
);

// converts a binary string into a hex string
export const fromBinToHex8 = (value) => (
  printHex8(parseInt(value, 2))
)

// converts an int to hex and fills with zeros up to string of a given size
export const printToHex = (size) => (number) => (
  number.toString(16).padStart(size, '0').toUpperCase()
)

// converts an int to hex and fills with zeros up to string of size 2
export const printHex8 = printToHex(2)

// converts an int to hex and fills with zeros up to string of size 4
export const printHex16 = printToHex(4)

// builds an object dividing low and high register values
// from an int value
export const fromReg = (name, number) => {
  const hex = toHex16(number);
  return { name, L: hex.slice(-2), H: hex.slice(0, 2) }
}

// converts an int into operands to be stored in memory
export const toOperand = (value) => {
  const hex = toHex16(value);
  return { L: hex.slice(0, 2), H: hex.slice(-2) }
}

// converts an hex string value to an int
export const fromHexToInt = (hex) => {
  return parseInt(hex, 16);
}

// converts an hex string value to a two's complement int
export const fromHexTo2CInt = (hex) => {
  return toInt16(parseInt(hex, 16));
}

// gives an int to be stored in one part of a register
const forRegPart = (prev, number, f) => {
  const hexR = toHex16(prev);
  const hexV = toHex8(number);
  const res = f(hexV, hexR);
  return parseInt(res, 16);
}

// gives an int to be stored in the low part register
export const forRegLowPart = (prev, number) => {
  return forRegPart(prev, number, (v, r) => r.slice(0, 2) + v.slice(-2));
}

// gives an int to be stored in the high part register
export const forRegHighPart = (prev, number) => {
  return forRegPart(prev, number, (v, r) => v.slice(0, 2) + r.slice(-2));
}

// gives an int to be stored in a register, from another register
export const forReg = (reg, number) => {
  if (REGISTERS.includes(reg)) {
    return number;
  }
  const regLH = fromReg(reg, number);
  if (LOW_REGISTERS.includes(reg)) {
    return regLH.L;
  }
  if (HIGH_REGISTERS.includes(reg)) {
    return regLH.H;
  }
  return number;
}