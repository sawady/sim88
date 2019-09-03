export const combination = (instruction) => {
  switch (instruction.group) {
    case 'binary':
      return `${instruction.p1.type}-${instruction.p2.type}`;
    case 'unary':
      return `${instruction.p1.type}`;
    case 'END':
      return 'END';
    default:
      throw new Error('Unknown group');
  }
}

export const instructionName = (instruction) => {
  if (instruction.type === 'END') return 'END';
  return `${instruction.type}-${combination(instruction)}`;
}
