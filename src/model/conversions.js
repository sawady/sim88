export const toHex16 = (number) => ('0000' + new Number(number).toString(16).toUpperCase()).slice(-4);

export const toHex8 = (number) => ('00' + new Number(number).toString(8).toUpperCase()).slice(-2);

export const toReg = (name, hex) => { 
  const value = toHex16(hex);
  return { name, L: value.slice(2), H: value.slice(-2) }
}