// Splits the source into lines and parses each one with the grammar
// (src/grammar.pegjs, compiled by peggy at build/test time; see vite.config.js).
//
// parse(source) -> { statements, ended }
//   statements: [{ line, source, label, body }], without blank or comment-only lines
//   ended: whether an END directive was found (everything after it is ignored)

import { parse as parseLine, SyntaxError as GrammarSyntaxError } from '../grammar.pegjs';
import type { Size } from './alu';

// The syntax tree that src/grammar.pegjs builds. `ptr` is the size given by
// BYTE PTR / WORD PTR in front of an operand.
interface Ptr {
  ptr?: Size;
}
export type Expr = Ptr &
  (
    | { kind: 'number'; value: number; char?: boolean }
    | { kind: 'neg'; value: Expr }
    | { kind: 'offset' | 'symbol'; name: string }
    | { kind: 'binary'; op: string; left: Expr; right: Expr }
  );
export type DataItem =
  | { kind: 'uninit' }
  | { kind: 'dup'; count: Expr; values: DataItem[] }
  | { kind: 'string'; value: string; quote?: string }
  | Expr;
export type MemoryNode = Ptr & { kind: 'memory'; base: string | null; disp: Expr | null };
export type RegisterNode = Ptr & { kind: 'register'; name: string };
export type OperandNode = MemoryNode | RegisterNode | Expr;
export type DataBody = { kind: 'data'; name: string | null; size: Size; values: DataItem[] };
export type InstructionBody = { kind: 'instruction'; mnemonic: string; operands: OperandNode[] };
export type Body =
  | DataBody
  | InstructionBody
  | { kind: 'equ'; name: string; value: Expr }
  | { kind: 'org'; value: Expr }
  | { kind: 'end' };

interface ParsedLine {
  label: string | null;
  body: Body | null;
}
export interface Statement extends ParsedLine {
  line: number;
  source: string;
}

export class AsmError extends Error {
  line: number | undefined;

  constructor(message: string, line: number | undefined) {
    super(message);
    this.name = 'AsmError';
    this.line = line;
  }
}

export function parse(source: string): { statements: Statement[]; ended: boolean } {
  const lines = source.split(/\r\n|\r|\n/);
  const statements: Statement[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = i + 1;
    let parsed: ParsedLine;
    try {
      parsed = parseLine(lines[i]) as ParsedLine;
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
