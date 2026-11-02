// The assembler and the simulator (src/model) write their messages in English
// (a few, from the machine, in Spanish). The UI shows them in the chosen
// language: each known message is recognized by a pattern and rewritten from
// the dictionaries. A message without a pattern is shown as it is.
//
// A test (__tests__/messages.test.js) checks that every message of the model
// has a pattern here.

import { t } from './core';

const K = (key, params) => ({ key, params });

// [pattern, (match groups, lang) => { key, params }]
const PATTERNS = [
  [/^HLT: la CPU espera una interrupción\./, () => K('msg.hltWait')],
  [/^Programa terminado \((?<how>.+)\)\.$/, (g) => K('msg.ended', g)],
  [/^Punto de parada \(INT 3\)\.$/, () => K('msg.breakpoint')],
  [/^Unknown opcode (?<opcode>\S+) at (?<address>[0-9A-F]+)h\.$/, (g) => K('msg.unknownOpcode', g)],
  [/^(?<mnemonic>\S+) is not implemented yet \(at (?<address>[0-9A-F]+)h\)\.$/, (g) => K('msg.notImplemented', g)],
  [/^END is missing/, () => K('msg.endMissing')],
  [/^(?<name>.+) is a register name and cannot be used as a name\.$/, (g) => K('msg.registerName', g)],
  [/^(?<name>.+) is a reserved word and cannot be used as a name\.$/, (g) => K('msg.reserved', g)],
  [/^(?<name>.+) is already defined \(line (?<line>\d+)\)\.$/, (g) => K('msg.redefined', g)],
  [/^A memory address cannot be negated\.$/, () => K('msg.negateAddress')],
  [/^(?<name>.+) is not defined\.$/, (g) => K('msg.undefined', g)],
  [/^(?<name>.+) has no value yet at this point\.$/, (g) => K('msg.noValueYet', g)],
  [/^Two memory addresses cannot be added\.$/, () => K('msg.addAddresses')],
  [/^A memory address cannot be subtracted from a number\.$/, () => K('msg.subtractAddress')],
  [/^A memory address cannot be used with "(?<op>.+)"\.$/, (g) => K('msg.addressOp', g)],
  [
    /^(?<what>.+) are a SIM88 extension, not allowed in MSX88 strict mode\.$/,
    (g, lang) => K('msg.extension', { what: extension(g.what, lang) }),
  ],
  [/^Division by zero\.$/, () => K('msg.divisionByZero')],
  [/^(?<name>.+) is defined in terms of itself\.$/, (g) => K('msg.circular', g)],
  [/^The value of (?<what>.+) must be known at this point/, (g) => K('msg.mustBeKnown', g)],
  [/^MSX88 only supports \[BX\] as indirect addressing/, () => K('msg.onlyBx')],
  [/^BYTE PTR \/ WORD PTR apply to memory operands\.$/, () => K('msg.ptrMemory')],
  [
    /^Operand size mismatch: (?<a>.+) is (?<sizeA>\d+) bits and (?<b>.+) is (?<sizeB>\d+) bits\.$/,
    (g, lang) => K('msg.sizeMismatch', { ...g, a: operand(g.a, lang), b: operand(g.b, lang) }),
  ],
  [
    /^Unknown instruction (?<mnemonic>\S+) \(a label needs a colon: \S+:\)\.$/,
    (g) => K('msg.unknownInstructionLabel', g),
  ],
  [/^Unknown instruction (?<mnemonic>\S+)\.$/, (g) => K('msg.unknownInstruction', g)],
  [
    /^(?<mnemonic>\S+) takes (?<expected>.+) operand\S*, not (?<count>\d+)\.$/,
    (g, lang) => K('msg.operandCount', { ...g, expected: g.expected.split(' or ').join(t(lang, 'msg.or')) }),
  ],
  [/^(?<mnemonic>\S+) cannot have two memory operands/, (g) => K('msg.memToMem', g)],
  [/^The size of the memory operand is unknown/, () => K('msg.unknownSize')],
  [
    /^Invalid operands for (?<mnemonic>\S+): (?<kinds>.+)\.$/,
    (g, lang) =>
      K('msg.invalidOperands', {
        ...g,
        kinds: g.kinds
          .split(', ')
          .map((k) => (k === 'memory' || k === 'immediate' ? t(lang, `msg.kind.${k}`) : k))
          .join(', '),
      }),
  ],
  [/^Strings can only be defined with DB\.$/, () => K('msg.stringsDb')],
  [/^The DUP count cannot be negative\.$/, () => K('msg.dupNegative')],
  [/^ORG (?<address>\S+) is outside the memory/, (g) => K('msg.orgOutside', g)],
  [/^The program goes past the end of the memory/, () => K('msg.pastEnd')],
  [/^This overlaps with line (?<line>\d+) at address (?<address>\S+): /, (g) => K('msg.overlap', g)],
  [
    /^Execution starts at (?<address>\S+), but there is no instruction there: put the code after ORG (?<org>\S+)\.$/,
    (g) => K('msg.noCode', g),
  ],
  [/^(?<value>-?\d+) does not fit in (?<bits>\d+) bits\.$/, (g) => K('msg.doesNotFit', g)],
  [/^The character "(?<char>.+)" is not ASCII\.$/, (g) => K('msg.notAscii', g)],
  [/^Address (?<value>-?\d+) is outside the memory\.$/, (g) => K('msg.addressOutside', g)],
  [
    /^(?<value>-?\d+) is not a valid (?<what>.+) \(0\.\.255\)\.$/,
    (g) => K(g.what === 'interrupt number' ? 'msg.invalidInterrupt' : 'msg.invalidPort', g),
  ],
  [
    /^(?<mnemonic>\S+) cannot reach (?<target>\S+): conditional jumps .* \(this one needs (?<rel>-?\d+)\)\.$/,
    (g) => K('msg.jumpRange', g),
  ],
  [
    /^Syntax error: Expected (?<expected>.+) but (?<found>.+) found\.$/,
    (g, lang) => K('msg.syntax', { expected: syntaxList(g.expected, lang), found: syntaxItem(g.found, lang) }),
  ],
  [/^Syntax error: (?<detail>.+)$/, (g) => K('msg.syntaxOther', g)],
];

function extension(what, lang) {
  let m;
  if ((m = what.match(/^Character literals like (?<char>.+)$/))) return t(lang, 'msg.ext.char', m.groups);
  if ((m = what.match(/^"(?<op>.+)" in expressions$/))) return t(lang, 'msg.ext.op', m.groups);
  if (what.startsWith('Direct addresses in brackets')) return t(lang, 'msg.ext.brackets');
  if (what === 'Single-quoted strings') return t(lang, 'msg.ext.single');
  return what;
}

const operand = (text, lang) => (text === 'the memory operand' ? t(lang, 'msg.theMemoryOperand') : text);

const SYNTAX_WORDS = {
  'end of input': 'msg.syntax.endOfInput',
  operand: 'msg.syntax.operand',
  expression: 'msg.syntax.expression',
  name: 'msg.syntax.name',
};

function syntaxItem(item, lang) {
  if (SYNTAX_WORDS[item]) return t(lang, SYNTAX_WORDS[item]);
  if (/^\[.*\]$/.test(item)) return t(lang, 'msg.syntax.anyChar');
  return item;
}

// 'A, B, or C' / 'A or B' / 'A'
function syntaxList(list, lang) {
  const items = list.replace(/,? or /, ', ').split(', ');
  const words = items.map((i) => syntaxItem(i, lang));
  if (words.length === 1) return words[0];
  return `${words.slice(0, -1).join(', ')}${t(lang, 'msg.syntax.or')}${words[words.length - 1]}`;
}

// Recognizes a message of the model: { key, params } or null.
export function recognize(message, lang = 'es') {
  for (const [pattern, toKey] of PATTERNS) {
    const m = String(message).match(pattern);
    if (m) return toKey({ ...m.groups }, lang);
  }
  return null;
}

// A message of the model in `lang`.
export function translateMessage(lang, message) {
  if (!message) return message;
  const found = recognize(message, lang);
  return found ? t(lang, found.key, found.params) : message;
}
