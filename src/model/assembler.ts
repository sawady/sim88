// Two-pass assembler for the MSX88 dialect.
//
// assemble(source) -> {
//   memory: Map(address -> byte),      only the bytes the program defines
//   entry,                             initial IP (2000h)
//   symbols: { NAME: { kind, value, size, line } },
//   lines: Map(address -> source line) for the first byte of every instruction
//   listing: [{ line, address, bytes }]
// }
//
// Errors are AsmError with the source line.
//
// Options:
//   strict: MSX88 strict mode. Rejects what SIM88 accepts as extensions to
//           the MSX88 dialect: character literals ('A'), single-quoted
//           strings, direct addresses in brackets ([1000h]), and * and / in
//           expressions. Names are case sensitive, as in ASM88 (`lazo:` and
//           `JNZ LAZO` give "Etiqueta no definida"; tests/fidelity:
//           asm-case-labels). Outside strict mode they are not.
//
// Pass 0 learns the kind of every symbol (code label, data label, constant),
// so pass 1 can size every instruction before knowing addresses: a data label
// used as an operand is a memory operand, a constant or OFFSET is an immediate.
// Pass 1 assigns addresses; pass 2 evaluates expressions and emits bytes.

import { AsmError, parse } from './parser';
import type { DataBody, DataItem, Expr, InstructionBody, OperandNode, RegisterNode, Statement } from './parser';
import { ASM_REGISTERS, ASM_ROWS, MNEMONICS, REG8, REG16, hasModRM, regSize } from './isa';
import type { Row } from './isa';
import { CODE_START } from './cpu';
import { asmHex } from './format';
import type { Size } from './alu';

export interface AsmSymbol {
  name: string;
  kind: 'label' | 'data' | 'const';
  size: Size | undefined;
  line: number;
  value: number | undefined;
  expr?: Expr;
}

export interface ListingEntry {
  line: number;
  address: number;
  bytes: (number | null)[];
}

export interface Program {
  memory: Map<number, number>;
  entry: number;
  symbols: Record<string, AsmSymbol>;
  lines: Map<number, number>;
  listing: ListingEntry[];
}

interface Context {
  symbols: Record<string, AsmSymbol>;
  strict: boolean;
  key: (name: string) => string;
}

// The value of an expression (null when it is not known yet, in pass 1).
interface Value {
  value: number | null;
  memory: boolean;
  size: Size | undefined;
}

type RegPlan = { kind: 'reg'; name: string; size: Size | undefined };
type MemPlan = { kind: 'mem'; base: string | null; disp: Expr | null; size: Size | undefined };
type ImmPlan = { kind: 'imm'; expr: Expr; size?: undefined };
type PlannedOperand = RegPlan | MemPlan | ImmPlan;

interface Plan {
  row: Row;
  operands: PlannedOperand[];
  size: Size | undefined;
  length: number;
}

// A statement as the passes complete it.
interface PlacedStatement extends Statement {
  address: number;
  length: number;
  plan?: Plan;
}

function fail(message: string, line: number | undefined): never {
  throw new AsmError(message, line);
}

const DIRECTIVES = ['ORG', 'END', 'DB', 'DW', 'EQU', 'OFFSET', 'PTR', 'BYTE', 'WORD', 'DUP'];

export function assemble(source: string, { strict = false } = {}): Program {
  const { statements, ended } = parse(source);
  if (!ended) fail('END is missing: the program must finish with the END directive.', undefined);
  const key = strict ? (name: string) => name : (name: string) => name.toUpperCase();
  const symbols = collectSymbols(statements, key);
  const ctx: Context = { symbols, strict, key };
  const placed = statements as PlacedStatement[];
  pass1(placed, ctx);
  return pass2(placed, ctx);
}

// ------------------------------------------------------------------ pass 0

function collectSymbols(statements: Statement[], keyOf: (name: string) => string): Record<string, AsmSymbol> {
  const symbols: Record<string, AsmSymbol> = {};
  const define = (name: string, kind: AsmSymbol['kind'], size: Size | undefined, line: number) => {
    const upper = name.toUpperCase();
    if (ASM_REGISTERS.includes(upper) || REG16.includes(upper)) {
      fail(`${name} is a register name and cannot be used as a name.`, line);
    }
    if (MNEMONICS.includes(upper) || DIRECTIVES.includes(upper)) {
      fail(`${name} is a reserved word and cannot be used as a name.`, line);
    }
    const key = keyOf(name);
    if (symbols[key]) fail(`${name} is already defined (line ${symbols[key].line}).`, line);
    symbols[key] = { name, kind, size, line, value: undefined };
  };
  for (const { label, body, line } of statements) {
    const isData = body && body.kind === 'data';
    if (label) define(label, isData ? 'data' : 'label', isData ? (body as DataBody).size : undefined, line);
    if (isData && (body as DataBody).name) define((body as DataBody).name as string, 'data', (body as DataBody).size, line);
    if (body && body.kind === 'equ') define(body.name, 'const', undefined, line);
  }
  return symbols;
}

// ------------------------------------------------------------- expressions

// Evaluates an expression. Returns { value, memory, size }: `memory` is true
// when it names a data label (a memory operand), `size` is that label's size.
// With `partial`, an undefined value gives null instead of an error (pass 1).
function evaluate(
  expr: Expr,
  ctx: Context,
  line: number | undefined,
  { partial = false, visiting = new Set<AsmSymbol>() } = {}
): Value {
  const ev = (e: Expr) => evaluate(e, ctx, line, { partial, visiting });
  const plain = (value: number | null): Value => ({ value, memory: false, size: undefined });
  switch (expr.kind) {
    case 'number':
      if (expr.char) extension(ctx, `Character literals like '${String.fromCharCode(expr.value)}'`, line);
      return plain(expr.value);
    case 'neg': {
      const v = ev(expr.value);
      if (v.memory) fail('A memory address cannot be negated.', line);
      return plain(v.value === null ? null : -v.value);
    }
    case 'offset':
    case 'symbol': {
      const symbol = ctx.symbols[ctx.key(expr.name)];
      if (!symbol) fail(`${expr.name} is not defined.`, line);
      let value: number | null | undefined = symbol.value;
      if (symbol.kind === 'const') value = constantValue(symbol, ctx, partial, visiting);
      if (value === undefined) {
        if (partial) value = null;
        else fail(`${expr.name} has no value yet at this point.`, line);
      }
      if (expr.kind === 'symbol' && symbol.kind === 'data') {
        return { value: value as number | null, memory: true, size: symbol.size };
      }
      return plain(value as number | null);
    }
    case 'binary': {
      if (expr.op === '*' || expr.op === '/') extension(ctx, `"${expr.op}" in expressions`, line);
      const l = ev(expr.left);
      const r = ev(expr.right);
      const value = l.value === null || r.value === null ? null : arithmetic(expr.op, l.value, r.value, line);
      if (expr.op === '+') {
        if (l.memory && r.memory) fail('Two memory addresses cannot be added.', line);
        if (l.memory || r.memory) return { value, memory: true, size: l.memory ? l.size : r.size };
        return plain(value);
      }
      if (expr.op === '-') {
        if (r.memory && !l.memory) fail('A memory address cannot be subtracted from a number.', line);
        if (l.memory && !r.memory) return { value, memory: true, size: l.size };
        return plain(value); // a difference of addresses is a number
      }
      if (l.memory || r.memory) fail(`A memory address cannot be used with "${expr.op}".`, line);
      return plain(value);
    }
    default:
      throw new Error(`Unknown expression ${(expr as Expr).kind}`);
  }
}

function extension(ctx: Context, what: string, line: number | undefined): void {
  if (ctx.strict) fail(`${what} are a SIM88 extension, not allowed in MSX88 strict mode.`, line);
}

function arithmetic(op: string, a: number, b: number, line: number | undefined): number {
  switch (op) {
    case '+':
      return a + b;
    case '-':
      return a - b;
    case '*':
      return a * b;
    case '/':
      if (b === 0) fail('Division by zero.', line);
      return Math.trunc(a / b);
    default:
      throw new Error(op);
  }
}

function constantValue(symbol: AsmSymbol, ctx: Context, partial: boolean, visiting: Set<AsmSymbol>): number | undefined {
  if (symbol.value !== undefined) return symbol.value;
  if (visiting.has(symbol)) fail(`${symbol.name} is defined in terms of itself.`, symbol.line);
  visiting.add(symbol);
  const { value } = evaluate(symbol.expr as Expr, ctx, symbol.line, { partial, visiting });
  visiting.delete(symbol);
  if (value === null) return undefined;
  symbol.value = value;
  return value;
}

// A value needed in pass 1 (ORG, DUP counts): it must be known already.
function evaluateNow(expr: Expr, ctx: Context, line: number, what: string): number {
  const { value } = evaluate(expr, ctx, line, { partial: true });
  if (value === null) fail(`The value of ${what} must be known at this point (define it above).`, line);
  return value;
}

const fits = (value: number, size: Size): boolean =>
  size === 8 ? value >= -128 && value <= 255 : value >= -32768 && value <= 65535;

// ---------------------------------------------------------------- operands

// Operand of an instruction, classified with the symbol kinds:
//   { kind: 'reg', name, size }
//   { kind: 'mem', base: 'BX' | null, disp: expr | null, size }
//   { kind: 'imm', expr }
function classify(operand: OperandNode, ctx: Context, line: number): PlannedOperand {
  if (operand.kind === 'register') {
    return { kind: 'reg', name: (operand as RegisterNode).name, size: regSize((operand as RegisterNode).name) };
  }
  if (operand.kind === 'memory') {
    if (operand.base && operand.disp) {
      fail('MSX88 only supports [BX] as indirect addressing (no [BX + displacement]).', line);
    }
    if (!operand.base) {
      extension(ctx, 'Direct addresses in brackets (use a variable name)', line);
    }
    let size: Size | undefined = operand.ptr;
    if (operand.disp && size === undefined) {
      size = evaluate(operand.disp, ctx, line, { partial: true }).size;
    }
    return { kind: 'mem', base: operand.base, disp: operand.disp, size };
  }
  // An expression: memory if it names a data label, else an immediate.
  const info = evaluate(operand, ctx, line, { partial: true });
  if (info.memory) {
    return { kind: 'mem', base: null, disp: stripPtr(operand), size: operand.ptr || info.size };
  }
  if (operand.ptr) fail('BYTE PTR / WORD PTR apply to memory operands.', line);
  return { kind: 'imm', expr: operand };
}

const stripPtr = ({ ptr, ...expr }: Expr): Expr => expr as Expr;

const sizeOfCode = (code: string): Size => (code.endsWith('b') ? 8 : 16);

function matches(code: string, operand: PlannedOperand, size: Size | undefined, opcode: number): boolean {
  switch (code) {
    case 'AL':
    case 'AX':
    case 'DX':
      return operand.kind === 'reg' && operand.name === code;
    case 'Zb':
    case 'Zw':
      return (
        operand.kind === 'reg' &&
        operand.size === sizeOfCode(code) &&
        (operand.size === 8 ? REG8 : REG16).indexOf(operand.name) === (opcode & 7)
      );
    case 'Gb':
    case 'Gw':
      return operand.kind === 'reg' && operand.size === sizeOfCode(code);
    case 'Eb':
    case 'Ew':
      return (operand.kind === 'reg' || operand.kind === 'mem') && size === sizeOfCode(code);
    case 'Ib':
    case 'Iw':
    case 'Jb':
    case 'Jw':
    case 'Aw':
      return operand.kind === 'imm';
    default:
      return false;
  }
}

// The operand size of an instruction, from its registers and memory operands.
function operandSize(mnemonic: string, operands: PlannedOperand[], line: number): Size | undefined {
  // IN/OUT: the accumulator gives the size (DX or the port number do not).
  const relevant =
    mnemonic === 'IN' ? operands.slice(0, 1) : mnemonic === 'OUT' ? operands.slice(1) : operands;
  const sizes = [...new Set(relevant.filter((o) => o.size).map((o) => o.size))];
  if (sizes.length > 1) {
    const describe = (o: PlannedOperand) => (o.kind === 'reg' ? o.name : 'the memory operand');
    const [a, b] = relevant.filter((o) => o.size);
    fail(
      `Operand size mismatch: ${describe(a)} is ${a.size} bits and ${describe(b)} is ${b.size} bits.`,
      line
    );
  }
  return sizes[0];
}

// Chooses the table row for an instruction and computes its length.
function plan(statement: PlacedStatement, ctx: Context): Plan {
  const { line } = statement;
  const body = statement.body as InstructionBody;
  const { mnemonic } = body;
  const rows = ASM_ROWS[mnemonic];
  if (!rows) {
    const hint = body.operands.length === 0 && !statement.label
      ? ` (a label needs a colon: ${mnemonic}:)` : '';
    fail(`Unknown instruction ${mnemonic}${hint}.`, line);
  }
  const operands = body.operands.map((o) => classify(o, ctx, line));
  const counts = [...new Set(rows.map((r) => r.operands.length))];
  if (!counts.includes(operands.length)) {
    const expected = counts.join(' or ');
    fail(`${mnemonic} takes ${expected} operand${expected === '1' ? '' : 's'}, not ${operands.length}.`, line);
  }
  if (operands.filter((o) => o.kind === 'mem').length > 1) {
    fail(`${mnemonic} cannot have two memory operands (memory to memory is not allowed).`, line);
  }
  const size = operandSize(mnemonic, operands, line);
  const row = rows.find(
    (r) => r.operands.length === operands.length && r.operands.every((code, i) => matches(code, operands[i], size, r.opcode))
  );
  if (!row) {
    const mem = operands.find((o) => o.kind === 'mem');
    if (mem && size === undefined) {
      fail(`The size of the memory operand is unknown: use BYTE PTR or WORD PTR.`, line);
    }
    const kinds = operands.map((o) => (o.kind === 'reg' ? o.name : o.kind === 'mem' ? 'memory' : 'immediate'));
    fail(`Invalid operands for ${mnemonic}: ${kinds.join(', ')}.`, line);
  }

  let length = 1;
  if (hasModRM(row)) length += 1;
  row.operands.forEach((code, i) => {
    const o = operands[i];
    if ((code === 'Eb' || code === 'Ew') && o.kind === 'mem' && !o.base) length += 2;
    if (code === 'Ib' || code === 'Jb') length += 1;
    if (code === 'Iw' || code === 'Jw' || code === 'Aw') length += 2;
  });
  return { row, operands, size, length };
}

// ------------------------------------------------------------------ pass 1

function dataLength(body: DataBody, ctx: Context, line: number): number {
  const unit = body.size / 8;
  const itemLength = (item: DataItem): number => {
    switch (item.kind) {
      case 'uninit':
        return unit;
      case 'string':
        if (item.quote) extension(ctx, 'Single-quoted strings', line);
        if (body.size !== 8) fail('Strings can only be defined with DB.', line);
        return item.value.length;
      case 'dup': {
        const count = evaluateNow(item.count, ctx, line, 'the DUP count');
        if (count < 0) fail('The DUP count cannot be negative.', line);
        return count * item.values.reduce((sum, v) => sum + itemLength(v), 0);
      }
      default:
        return unit;
    }
  };
  return body.values.reduce((sum, v) => sum + itemLength(v), 0);
}

function pass1(statements: PlacedStatement[], ctx: Context): void {
  let address = CODE_START;
  for (const statement of statements) {
    const { label, body, line } = statement;
    if (body && body.kind === 'equ') {
      ctx.symbols[ctx.key(body.name)].expr = body.value;
      continue;
    }
    if (body && body.kind === 'org') {
      address = evaluateNow(body.value, ctx, line, 'ORG');
      if (address < 0 || address > 0xffff) fail(`ORG ${asmHex(address)} is outside the memory (0000h-FFFFh).`, line);
    }
    if (label) ctx.symbols[ctx.key(label)].value = address;
    statement.address = address;
    if (!body) continue;
    if (body.kind === 'data') {
      if (body.name) ctx.symbols[ctx.key(body.name)].value = address;
      statement.length = dataLength(body, ctx, line);
    } else if (body.kind === 'instruction') {
      statement.plan = plan(statement, ctx);
      statement.length = statement.plan.length;
    } else {
      statement.length = 0;
    }
    address += statement.length;
    if (address > 0x10000) fail('The program goes past the end of the memory (FFFFh).', line);
  }
}

// ------------------------------------------------------------------ pass 2

function pass2(statements: PlacedStatement[], ctx: Context): Program {
  const memory = new Map<number, number>();
  const owner = new Map<number, number>(); // address -> line that wrote it
  const lines = new Map<number, number>();
  const listing: ListingEntry[] = [];

  for (const statement of statements) {
    const { body, line, address } = statement;
    if (!body || !statement.length) continue;
    let bytes: (number | null)[];
    if (body.kind === 'data') {
      bytes = encodeData(body, ctx, line);
    } else if (body.kind === 'instruction') {
      bytes = encodeInstruction(statement, ctx);
      lines.set(address, line);
    } else {
      continue;
    }
    if (bytes.length !== statement.length) {
      throw new Error(`Internal error: line ${line} has ${bytes.length} bytes, expected ${statement.length}`);
    }
    bytes.forEach((byte, i) => {
      const a = address + i;
      if (owner.has(a)) {
        fail(`This overlaps with line ${owner.get(a)} at address ${asmHex(a)}: check the ORG directives.`, line);
      }
      owner.set(a, line);
      if (byte !== null) memory.set(a, byte);
    });
    listing.push({ line, address, bytes });
  }

  const hasCode = statements.some((s) => s.body && s.body.kind === 'instruction');
  if (hasCode && !lines.has(CODE_START)) {
    fail(
      `Execution starts at ${asmHex(CODE_START)}, but there is no instruction there: put the code after ORG ${asmHex(CODE_START)}.`,
      undefined
    );
  }

  return { memory, entry: CODE_START, symbols: ctx.symbols, lines, listing };
}

// '?' bytes are null: they are reserved but not written (memory keeps its value).
function encodeData(body: DataBody, ctx: Context, line: number): (number | null)[] {
  const out: (number | null)[] = [];
  const emit = (value: number) => {
    if (!fits(value, body.size)) fail(`${value} does not fit in ${body.size} bits.`, line);
    out.push(value & 0xff);
    if (body.size === 16) out.push((value >> 8) & 0xff);
  };
  const item = (v: DataItem): void => {
    switch (v.kind) {
      case 'uninit':
        for (let i = 0; i < body.size / 8; i++) out.push(null);
        break;
      case 'string':
        for (const c of v.value) {
          const code = c.charCodeAt(0);
          if (code > 255) fail(`The character "${c}" is not ASCII.`, line);
          out.push(code);
        }
        break;
      case 'dup': {
        const count = evaluate(v.count, ctx, line).value as number;
        for (let i = 0; i < count; i++) v.values.forEach(item);
        break;
      }
      default:
        emit(evaluate(v, ctx, line).value as number);
    }
  };
  body.values.forEach(item);
  return out;
}

function modrmByte(mod: number, reg: number, rm: number): number {
  return (mod << 6) | (reg << 3) | rm;
}

const regIndex = (operand: RegPlan): number => (operand.size === 8 ? REG8 : REG16).indexOf(operand.name);

function encodeInstruction(statement: PlacedStatement, ctx: Context): number[] {
  const { line, address } = statement;
  const { row, operands, length } = statement.plan as Plan;
  const bytes = [row.opcode];
  const tail: number[] = [];

  if (hasModRM(row)) {
    let reg = row.ext !== undefined ? row.ext : 0;
    let mod = 3;
    let rm = 0;
    row.operands.forEach((code, i) => {
      const o = operands[i];
      if (code === 'Gb' || code === 'Gw') reg = regIndex(o as RegPlan);
      if (code === 'Eb' || code === 'Ew') {
        if (o.kind === 'reg') {
          rm = regIndex(o);
        } else if ((o as MemPlan).base) {
          mod = 0;
          rm = 7; // [BX]
        } else {
          mod = 0;
          rm = 6; // direct address
          const value = evaluate((o as MemPlan).disp as Expr, ctx, line).value as number;
          if (value < 0 || value > 0xffff) fail(`Address ${value} is outside the memory.`, line);
          tail.push(value & 0xff, (value >> 8) & 0xff);
        }
      }
    });
    bytes.push(modrmByte(mod, reg, rm));
  }
  bytes.push(...tail);

  row.operands.forEach((code, i) => {
    const o = operands[i];
    if (code === 'Ib' || code === 'Iw') {
      const size = sizeOfCode(code);
      const value = evaluate((o as ImmPlan).expr, ctx, line).value as number;
      if (row.mnemonic === 'IN' || row.mnemonic === 'OUT' || row.mnemonic === 'INT') {
        if (value < 0 || value > 255) fail(`${value} is not a valid ${row.mnemonic === 'INT' ? 'interrupt number' : 'port'} (0..255).`, line);
      } else if (!fits(value, size)) {
        fail(`${value} does not fit in ${size} bits.`, line);
      }
      bytes.push(value & 0xff);
      if (size === 16) bytes.push((value >> 8) & 0xff);
    }
    if (code === 'Aw') {
      const target = evaluate((o as ImmPlan).expr, ctx, line).value as number;
      if (target < 0 || target > 0xffff) fail(`Address ${target} is outside the memory.`, line);
      bytes.push(target & 0xff, (target >> 8) & 0xff);
    }
    if (code === 'Jw' || code === 'Jb') {
      const target = evaluate((o as ImmPlan).expr, ctx, line).value as number;
      const next = address + length;
      const rel = target - next;
      if (code === 'Jb') {
        if (rel < -128 || rel > 127) {
          fail(
            `${row.mnemonic} cannot reach ${asmHex(target & 0xffff)}: conditional jumps reach 128 bytes back and 127 forward (this one needs ${rel}).`,
            line
          );
        }
        bytes.push(rel & 0xff);
      } else {
        bytes.push(rel & 0xff, (rel >> 8) & 0xff);
      }
    }
  });
  return bytes;
}
