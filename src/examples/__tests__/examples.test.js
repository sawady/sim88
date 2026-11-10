import { describe, expect, test } from 'vitest';
import { EXAMPLES, DEFAULT_EXAMPLE } from '..';
import { assemble } from '../../model/assembler';
import { createMachine, loadProgram, start, stepPhase, typeKey, pressF10, timerPulse, toggleSwitch } from '../../model/machine';
import { readReg } from '../../model/cpu';
import { pioOutputB } from '../../model/devices';

const example = (id) => EXAMPLES.find((e) => e.id.startsWith(id));

const machineFor = (e) => start(loadProgram(createMachine({ config: e.config }), assemble(e.source, { strict: true })));

const run = (machine, max = 100000) => {
  let m = machine;
  for (let i = 0; i < max && m.state === 'RUNNING' && !m.waitingInput; i++) m = stepPhase(m);
  return m;
};
const phases = (machine, n) => {
  let m = machine;
  for (let i = 0; i < n; i++) m = stepPhase(m);
  return m;
};

// The tests below run every example as it is in each language.
const inLanguage = (lang, e) => ({ ...e, source: e.versions[lang].source });

const TEXTS = {
  es: { prompt: 'Escriba una letra: ', timer: 'Pasaron 5 segundos. ', pio: 'ARQUITECTURA', hand: 'HOLA MUNDO', dma: 'COPIADO POR DMA' },
  en: { prompt: 'Type a letter: ', timer: '5 seconds went by. ', pio: 'ARCHITECTURE', hand: 'HELLO WORLD', dma: 'COPIED WITH DMA' },
};

describe('examples', () => {
  test('there is one per topic, with a title and a configuration', () => {
    expect(EXAMPLES.length).toBeGreaterThanOrEqual(9);
    expect(DEFAULT_EXAMPLE.id).toBe('01-suma-tabla');
    for (const e of EXAMPLES) {
      expect(e.title.length).toBeGreaterThanOrEqual(3);
      expect([0, 1, 2, 3]).toContain(e.config);
    }
    expect(example('08').config).toBe(2);
  });

  test.each(EXAMPLES.map((e) => [e.file, e]))('%s has an English version with the same shape', (_file, e) => {
    const { en, es } = e.versions;
    expect(en, 'missing src/examples/en version').toBeDefined();
    expect(en.source.split('\n').length).toBe(es.source.split('\n').length);
    const config = (src) => src.match(/^;\s*(?:conexionado|configuration):\s*(\d)/im)?.[1];
    expect(config(en.source)).toBe(config(es.source));
    // the same instructions, whatever the names
    const lines = (src) => [...assemble(src, { strict: true }).lines];
    expect(lines(en.source)).toEqual(lines(es.source));
    // English sources are in English
    expect(en.source).not.toMatch(/[áéíóúñ¿]/i);
  });

  test.each(EXAMPLES.flatMap((e) => Object.values(e.versions)))('$file assembles in MSX88 strict mode', ({ source }) => {
    expect(() => assemble(source, { strict: true })).not.toThrow();
  });

  describe.each(['es', 'en'])('running, in %s', (lang) => {
    const example = (id) => inLanguage(lang, EXAMPLES.find((e) => e.id.startsWith(id)));
    const text = TEXTS[lang];

    test('sum of a table', () => {
      const m = run(machineFor(example('01')));
      expect(m.message).toMatch(/HLT/);
      expect(m.cpu.mem[0x1006]).toBe(15);
    });

    test('subroutines', () => {
      const m = run(machineFor(example('02')));
      expect(m.cpu.mem[0x1002]).toBe(12);
      expect(m.cpu.mem[0x1003] | (m.cpu.mem[0x1004] << 8)).toBe(1234);
      expect(m.cpu.regs.SP).toBe(0x8000);
    });

    test('screen and keyboard', () => {
      let m = run(machineFor(example('03')));
      expect(m.waitingInput).toBe(true);
      m = run(typeKey(m, 'x'.charCodeAt(0)));
      expect(m.output).toBe(`${text.prompt}\nx\n`); // one line per INT 7, as MSX88
    });

    test('F10 interrupts', () => {
      let m = phases(machineFor(example('04')), 200);
      m = phases(pressF10(m), 50);
      expect(readReg(m.cpu, 'DX')).toBe(1);
    });

    test('timer', () => {
      let m = phases(machineFor(example('05')), 200);
      for (let i = 0; i < 5; i++) m = phases(timerPulse(m), 20);
      m = phases(m, 400);
      expect(m.output).toBe(`${text.timer}\n`);
    });

    test('switches and LEDs', () => {
      let m = phases(machineFor(example('06')), 100);
      m = phases(toggleSwitch(toggleSwitch(m, 1), 6), 50);
      expect(pioOutputB(m.devices)).toBe(0b0100_0010);
    });

    test('printer through the PIO', () => {
      const m = phases(run(machineFor(example('07'))), 0);
      expect(m.message).toMatch(/INT 0/);
      // the last characters may still be in the printer's buffer
      expect(m.devices.printer.paper + String.fromCharCode(...m.devices.printer.buffer)).toBe(text.pio);
    });

    test('printer through the HAND, by interrupts', () => {
      const m = run(machineFor(example('08')));
      expect(m.message).toMatch(/INT 0/);
      expect(m.devices.printer.paper + String.fromCharCode(...m.devices.printer.buffer)).toBe(text.hand);
    });

    test('DMA', () => {
      const m = run(machineFor(example('09')));
      expect(m.output).toBe(`${text.dma}\n`);
    });
  });
});
