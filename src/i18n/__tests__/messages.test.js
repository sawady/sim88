import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import { assemble } from '../../model/assembler';
import { recognize, translateMessage } from '../messages';

const errorOf = (source, options) => {
  try {
    assemble(source, options);
  } catch (e) {
    return e.message;
  }
  throw new Error('no error');
};

// Every message the model can show, taken from its source: the first
// argument of fail(...), of new CpuError(...) / new AsmError(...), and the
// `message:` of the machine. `${...}` becomes 1.
const MODEL = join(__dirname, '..', '..', 'model');
const sources = [
  ...readdirSync(MODEL).filter((f) => f.endsWith('.js')).map((f) => join(MODEL, f)),
  ...readdirSync(join(MODEL, 'devices')).filter((f) => f.endsWith('.js')).map((f) => join(MODEL, 'devices', f)),
].map((path) => ({ path, text: readFileSync(path, 'utf8') }));

const literal = /(?:fail\(|new (?:CpuError|AsmError)\(|message: )\s*(['`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
const modelMessages = sources.flatMap(({ path, text }) =>
  [...text.matchAll(literal)].map((m) => ({
    path: path.split('/model/')[1],
    sample: m[2].replace(/\$\{[^}]*\}/g, '1'),
  }))
);
// The `what` of extension(ctx, what, line) calls.
const extensions = sources.flatMap(({ text }) =>
  [...text.matchAll(/extension\(ctx,\s*(['`])((?:\\.|(?!\1).)*?)\1/g)].map((m) =>
    m[2].replace(/\$\{[^}]*\}/g, 'A')
  )
);

describe('messages of the assembler and the simulator', () => {
  test('the scan finds them', () => {
    expect(modelMessages.length).toBeGreaterThan(40);
    expect(extensions.length).toBe(4);
  });

  test.each(modelMessages.map((m) => [m.path, m.sample]))(
    '%s: "%s" is translated (add a pattern to src/i18n/messages.js and the texts to es.js and en.js)',
    (path, sample) => {
      expect(recognize(sample)).not.toBeNull();
    }
  );

  test.each(extensions)('extension "%s" is translated', (what) => {
    const message = `${what} are a SIM88 extension, not allowed in MSX88 strict mode.`;
    expect(translateMessage('es', message)).not.toContain(what);
  });

  test.each([
    ['ORG 2000h\nMOVE AL, 1\nEND', 'Instrucción desconocida: MOVE.', 'Unknown instruction MOVE.'],
    ['ORG 2000h\nMOV AL, 300\nEND', '300 no entra en 8 bits.', '300 does not fit in 8 bits.'],
    ['ORG 2000h\nMOV AL, BX\nEND', 'Los tamaños no coinciden: AL es de 8 bits y BX es de 16 bits.', null],
    ['ORG 2000h\nMOV AL, X\nEND', 'X no está definido.', 'X is not defined.'],
    ['ORG 2000h\nMOV AL, 1', 'Falta END: el programa tiene que terminar con la directiva END.', null],
    ['ORG 2000h\nMOV AL,\nEND', 'Error de sintaxis: se esperaba un operando, pero se encontró el fin de la línea.', 'Syntax error: expected an operand but found end of line.'],
    ['ORG 2000h\nMOV AL 1\nEND', 'Error de sintaxis: se esperaba ",", ";" o el fin de la línea, pero se encontró "1".', null],
    ['ORG 2000h\nPUSH\nEND', 'PUSH lleva 1 operando(s), no 0.', 'PUSH takes 1 operand(s), not 0.'],
    ['ORG 2000h\nMOV [BX], 1\nEND', 'No se sabe el tamaño del operando en memoria: use BYTE PTR o WORD PTR.', null],
    ['ORG 2000h\nMOV AL, CL, 1\nEND', null, null],
  ])('%j', (source, es, en) => {
    const message = errorOf(source);
    if (es) expect(translateMessage('es', message)).toBe(es);
    if (en) expect(translateMessage('en', message)).toBe(en);
    expect(recognize(message)).not.toBeNull();
  });

  test('strict mode errors', () => {
    const message = errorOf("ORG 2000h\nMOV AL, 'A'\nEND", { strict: true });
    expect(translateMessage('es', message)).toBe(
      "Caracteres entre comillas como 'A': es una extensión de SIM88, no permitida en el modo estricto MSX88."
    );
  });

  test('messages of the machine', () => {
    expect(translateMessage('en', 'Programa terminado (HLT).')).toBe('Program ended (HLT).');
    expect(translateMessage('es', 'Programa terminado (INT 0).')).toBe('Programa terminado (INT 0).');
    expect(translateMessage('en', 'Punto de parada (INT 3).')).toBe('Breakpoint (INT 3).');
  });

  test('unknown messages are shown as they are', () => {
    expect(translateMessage('es', 'Something new')).toBe('Something new');
    expect(translateMessage('es', null)).toBe(null);
  });
});
