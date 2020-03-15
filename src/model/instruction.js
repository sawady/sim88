import { BINARY, UNARY, VARIABLE, END } from "./constants";

export const combination = (instruction) => {
  switch (instruction.group) {
    case BINARY:
      return `${instruction.p1.type}-${instruction.p2.type}`;
    case UNARY:
      return `${instruction.p1.type}`;
    case VARIABLE:
      return `${instruction.type}-${instruction.vartype}`;
    case END:
      return END;
    default:
      throw new Error('Unknown group');
  }
}

export const instructionName = (instruction) => {
  if (instruction.type === END) return END;
  return `${instruction.type}-${combination(instruction)}`;
}
