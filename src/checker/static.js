export default function staticCheck(ast) {
  for (let i = 0; i < ast.length; i++) {
    checkParams(ast[i]);
  }
}

function checkParams(instruction) {
  switch (instruction.group) {
    case 'binary':
      checkParamsBinary(instruction);
      break;
    default:
      break;
  }
}

const validParams = {
  'mov': {
    'register-decimal': true,
  }
}

function checkParamsBinary(instruction) {
  const p1Type = instruction.p1.type;
  const p2Type = instruction.p2.type;
  const combination = `${p1Type}-${p2Type}`;
  if (!validParams[instruction.type][combination]) {
    console.log(instruction);
    const error = new Error(`
      Invalid params for ${instruction.type},
      you pass ${combination}
    `);
    error.line = instruction.line;
    throw error;
  }
}