export const toHex16 = (number) => ('0000' + Number(number).toString(16).toUpperCase()).slice(-4);

export const toHex8 = (number) => ('00' + Number(number).toString(16).toUpperCase()).slice(-2);

export const fromReg = (name, hex) => {
  const value = toHex16(hex);
  return { name, L: value.slice(0, 2), H: value.slice(-2) }
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
