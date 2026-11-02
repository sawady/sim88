import { describe, expect, test } from 'vitest';
import { assemble } from '../assembler';
import { createBus } from '../io';
import { createMachine, loadProgram, start, stepPhase, stepInstruction, stepBack, typeKey } from '../machine';
import { readReg } from '../cpu';

// A latch on port 30h (reads back what was written) and a counter on 31h-32h.
const latch = {
  name: 'latch',
  ports: [0x30],
  read: (devices) => devices.latch,
  write: (devices, _port, value) => ({ ...devices, latch: value }),
};
const counter = {
  name: 'counter',
  ports: [0x31, 0x32],
  read: (_devices, port) => (port === 0x31 ? 0x34 : 0x12),
  write: (devices) => ({ ...devices, writes: devices.writes + 1 }),
  tick: (devices) => ({ ...devices, ticks: devices.ticks + 1 }),
};
const INITIAL = { latch: 0x5a, writes: 0, ticks: 0 };

const machineFor = (source, devices = [latch, counter]) =>
  start(loadProgram(createMachine({ bus: createBus(devices, INITIAL) }), assemble(source)));

const runAll = (machine, max = 10000) => {
  let m = machine;
  for (let i = 0; i < max && m.state === 'RUNNING' && !m.waitingInput; i++) m = stepPhase(m);
  return m;
};

describe('I/O bus: IN and OUT', () => {
  test('IN reads a device and OUT writes it, by immediate port or DX', () => {
    const m = runAll(
      machineFor(`
        PORT EQU 30h
        IN AL, PORT
        MOV BL, AL
        MOV AL, 77h
        OUT PORT, AL
        MOV DX, 30h
        IN AL, DX
        HLT
        END`)
    );
    expect(readReg(m.cpu, 'BL')).toBe(0x5a);
    expect(readReg(m.cpu, 'AL')).toBe(0x77);
    expect(m.devices.latch).toBe(0x77);
  });

  test('16 bit IN reads two consecutive ports (little endian)', () => {
    const m = runAll(machineFor('IN AX, 31h\nHLT\nEND'));
    expect(readReg(m.cpu, 'AX')).toBe(0x1234);
  });

  test('a port with no device reads FFh and ignores writes', () => {
    const m = runAll(machineFor('MOV AL, 1\nOUT 40h, AL\nIN AL, 40h\nHLT\nEND'));
    expect(readReg(m.cpu, 'AL')).toBe(0xff);
  });

  test('step back undoes device state too', () => {
    let m = machineFor('MOV AL, 1\nOUT 30h, AL\nHLT\nEND');
    m = stepInstruction(stepInstruction(m));
    expect(m.devices.latch).toBe(1);
    expect(stepBack(m).devices.latch).toBe(0x5a);
  });

  test('devices tick once per instruction', () => {
    const m = runAll(machineFor('NOP\nNOP\nNOP\nHLT\nEND'));
    expect(m.devices.ticks).toBe(4);
  });

  test('two devices cannot share a port', () => {
    expect(() => createBus([latch, { ...latch, name: 'other' }])).toThrow(/Port 48/);
  });
});

describe('INT 6: reads a key into [BX]', () => {
  const SOURCE = `
    ORG 1000h
    CAR DB ?
    ORG 2000h
    MOV BX, OFFSET CAR
    INT 6
    MOV AL, CAR
    HLT
    END`;

  test('waits for a key, then stores it', () => {
    let m = runAll(machineFor(SOURCE));
    expect(m.waitingInput).toBe(true);
    expect(m.state).toBe('RUNNING');
    const ip = m.cpu.ip;
    m = stepPhase(m); // still waiting: the phase does not advance
    expect(m.waitingInput).toBe(true);
    expect(m.cpu.ip).toBe(ip);

    m = runAll(typeKey(m, 'A'.charCodeAt(0)));
    expect(m.state).toBe('STOPPED');
    expect(m.cpu.mem[0x1000]).toBe(0x41);
    expect(readReg(m.cpu, 'AL')).toBe(0x41);
    expect(m.input).toEqual([]);
  });

  test('keys typed in advance are buffered', () => {
    const m = runAll(typeKey(typeKey(machineFor(SOURCE), 0x31), 0x32));
    expect(m.cpu.mem[0x1000]).toBe(0x31);
    expect(m.input).toEqual([0x32]);
  });
});
