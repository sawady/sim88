// black magin
const createToInt = (size) => {
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

export const toInt2 = createToInt(2);
export const toInt8 = createToInt(8);
export const toInt16 = createToInt(16);

export const toHex8 = (number) => (
  printHex8(toInt8(number))
);

export const fromBinToHex8 = (value) => (
  printHex8(parseInt(value, 2))
)

export const toHex16 = (number) => (
  printHex16(toInt16(number))
);

export const printHex8 = (number) => (
  number.toString(16).padStart(2, '0').toUpperCase()
)

export const printHex16 = (number) => (
  number.toString(16).padStart(4, '0').toUpperCase()
)

export const fromReg = (name, hex) => {
  const value = toHex16(hex);
  return { name, L: value.slice(0, 2), H: value.slice(-2) }
}

export const toOperand = (value) => {
  const hex = toHex16(value);
  return { L: hex.slice(0, 2), H: hex.slice(-2) }  
}

export const readHex = (number) => {
  return parseInt(number + '', 16);
}

const build8Reg = (prev, value, f) => {
  const hexR = toHex16(prev);
  const hexV = toHex8(value);
  const res = f(hexV, hexR);
  return parseInt(res, 16);
}

export const toLowReg = (prev, value) => {
  return build8Reg(prev, value, (v, r) => r.slice(0, 2) + v);
}

export const toHighReg = (prev, value) => {
  return build8Reg(prev, value, (v, r) => v + r.slice(-2));
}
