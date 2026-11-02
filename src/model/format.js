// Number formatting for the UI and the disassembler.

// 'FF', '0A'
export const hex8 = (n) => (n & 0xff).toString(16).toUpperCase().padStart(2, '0');

// '2000', 'FFFF'
export const hex16 = (n) => (n & 0xffff).toString(16).toUpperCase().padStart(4, '0');

// Assembler style: 5h, 1000h, 0FFh (a leading 0 when the first digit is a letter)
export const asmHex = (n) => {
  const digits = n.toString(16).toUpperCase();
  return /^[A-F]/.test(digits) ? `0${digits}h` : `${digits}h`;
};

// Signed value of an 8 or 16 bit number
export const toSigned = (value, size) => {
  const sign = 1 << (size - 1);
  return value & sign ? value - (1 << size) : value;
};
