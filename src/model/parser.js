// Splits the source into lines and parses each one with the grammar
// (src/grammar.pegjs, compiled by peggy at build/test time; see vite.config.js).
//
// parse(source) -> { statements, ended }
//   statements: [{ line, source, label, body }], without blank or comment-only lines
//   ended: whether an END directive was found (everything after it is ignored)

import { parse as parseLine, SyntaxError as GrammarSyntaxError } from '../grammar.pegjs';

export class AsmError extends Error {
  constructor(message, line) {
    super(message);
    this.name = 'AsmError';
    this.line = line;
  }
}

export function parse(source) {
  const lines = source.split(/\r\n|\r|\n/);
  const statements = [];
  for (let i = 0; i < lines.length; i++) {
    const line = i + 1;
    let parsed;
    try {
      parsed = parseLine(lines[i]);
    } catch (e) {
      if (e instanceof GrammarSyntaxError) {
        throw new AsmError(`Syntax error: ${e.message}`, line);
      }
      throw e;
    }
    if (!parsed.label && !parsed.body) continue;
    statements.push({ line, source: lines[i], ...parsed });
    if (parsed.body && parsed.body.kind === 'end') return { statements, ended: true };
  }
  return { statements, ended: false };
}
