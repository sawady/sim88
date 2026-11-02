import { describe, expect, test } from 'vitest';
import { assemble } from '../assembler';
import {
  createMachine,
  loadProgram,
  start,
  stepPhase,
  stepInstruction,
  stepBack,
  setAluMode,
  EXECUTION_CYCLE,
  HISTORY_LIMIT,
} from '../machine';
import { readReg } from '../cpu';

const machineFor = (source) => start(loadProgram(createMachine(), assemble(source)));

const runAll = (machine, max = 10000) => {
  let m = machine;
  for (let i = 0; i < max && m.state === 'RUNNING'; i++) m = stepPhase(m);
  return m;
};

describe('machine: the fetch-decode-execute cycle', () => {
  test('a fresh machine is stopped, with the memory of a fresh MSX88', () => {
    const m = createMachine();
    expect(m.state).toBe('STOPPED');
    // only the monitor's vectors of INT 0/3/6/7
    expect(m.cpu.mem.slice(0x20).every((b) => b === 0)).toBe(true);
    expect(m.cpu.mem[2]).toBe(0xcf);
  });

  test('loading a program writes its bytes and sets IP to 2000h', () => {
    const m = machineFor('ORG 1000h\nN DB 7\nORG 2000h\nMOV AL, N\nINT 0\nEND');
    expect(m.cpu.mem[0x1000]).toBe(7);
    expect(m.cpu.mem[0x2000]).toBe(0x8a);
    expect(m.cpu.ip).toBe(0x2000);
    expect(m.state).toBe('RUNNING');
  });

  test('each phase shows its part of the cycle', () => {
    let m = machineFor('MOV AX, 1234h\nADD AX, 1\nINT 0\nEND');
    expect(EXECUTION_CYCLE).toHaveLength(5);

    m = stepPhase(m); // fetch
    expect(m.IR).toBe(0xb8);
    expect(m.activeComponents).toEqual(['IR']);
    expect(m.currentLine).toBe(1);

    m = stepPhase(m); // decode
    expect(m.decoder).toBe('MOV');
    expect(m.instruction.text).toBe('MOV AX, 1234h');

    m = stepPhase(m); // IP
    expect(m.cpu.ip).toBe(0x2003);
    expect(m.activeMemory).toEqual([0x2000, 0x2001, 0x2002]);

    m = stepPhase(m); // operands: not committed yet
    expect(readReg(m.cpu, 'AX')).toBe(0);

    m = stepPhase(m); // execute
    expect(readReg(m.cpu, 'AX')).toBe(0x1234);
    expect(m.activeComponents).toContain('AX');
    expect(m.phase).toBe(0);

    m = stepInstruction(stepInstruction(stepPhase(stepPhase(stepPhase(m)))));
    // (ADD) the ALU shows the operands and the result
    expect(m.alu).toEqual({ OP1: 0x1234, OP2: 1, RES: 0x1235 });
  });

  test('HLT waits for an interrupt, with a message, even when none can come (as MSX88)', () => {
    const m = runAll(machineFor('MOV AL, 1\nCLI\nHLT\nEND'));
    expect(m.state).toBe('RUNNING');
    expect(m.cpuHalted).toBe(true);
    expect(m.message).toMatch(/HLT/);
    expect(m.error).toBe(null);
  });

  test('INT 0 stops the machine with a message', () => {
    const m = runAll(machineFor('MOV AL, 1\nINT 0\nEND'));
    expect(m.state).toBe('STOPPED');
    expect(m.message).toMatch(/INT 0/);
  });

  test('INT 3 pauses the machine', () => {
    const m = runAll(machineFor('INT 3\nMOV AL, 1\nINT 0\nEND'));
    expect(m.state).toBe('PAUSED');
    expect(m.message).toMatch(/INT 3/);
    expect(m.cpu.ip).toBe(0x2002);
  });

  test('a runtime error stops the machine with the message', () => {
    const program = assemble('NOP\nINT 0\nEND');
    program.memory.set(0x2000, 0x0f);
    const m = runAll(start(loadProgram(createMachine(), program)));
    expect(m.state).toBe('STOPPED');
    expect(m.error).toMatch(/Unknown opcode 0Fh at 2000h/);
  });

  test('INT 7 output goes to the console', () => {
    const m = runAll(machineFor('ORG 1000h\nM DB "ok"\nORG 2000h\nMOV BX, OFFSET M\nMOV AL, 2\nINT 7\nINT 0\nEND'));
    expect(m.output).toBe('ok\n'); // one line per INT 7
  });
});

describe('machine: step back (a snapshot per instruction)', () => {
  test('restores registers, memory and IP of the previous instruction', () => {
    let m = machineFor('ORG 1000h\nV DB 1\nORG 2000h\nMOV AL, 5\nMOV V, AL\nINT 0\nEND');
    m = stepInstruction(m);
    m = stepInstruction(m);
    expect(m.cpu.mem[0x1000]).toBe(5);

    m = stepBack(m);
    expect(m.cpu.mem[0x1000]).toBe(1);
    expect(m.cpu.ip).toBe(0x2002);
    expect(readReg(m.cpu, 'AL')).toBe(5);
    expect(m.state).toBe('PAUSED');

    m = stepBack(m);
    expect(readReg(m.cpu, 'AL')).toBe(0);
    expect(m.cpu.ip).toBe(0x2000);
    expect(stepBack(m)).toBe(m); // nothing before the first instruction
  });

  test('in the middle of an instruction, goes back to its start', () => {
    let m = stepInstruction(machineFor('MOV AL, 5\nMOV BL, 6\nINT 0\nEND'));
    m = stepPhase(stepPhase(stepPhase(m)));
    expect(m.cpu.ip).toBe(0x2004);
    m = stepBack(m);
    expect(m.cpu.ip).toBe(0x2002);
    expect(m.phase).toBe(0);
  });

  test('after INT 0, stepping back lets the program continue', () => {
    let m = runAll(machineFor('MOV AL, 1\nINT 0\nEND'));
    m = stepBack(m);
    expect(m.state).toBe('PAUSED');
    expect(m.message).toBe(null);
    m = runAll(start(m));
    expect(m.state).toBe('STOPPED');
  });

  test('history is bounded', () => {
    const m = runAll(machineFor(`MOV CX, ${HISTORY_LIMIT + 10}\nL: DEC CX\nJNZ L\nINT 0\nEND`), 100000);
    expect(m.history.length).toBe(HISTORY_LIMIT);
  });
});

describe('machine: ALU mode', () => {
  const PUSH_SP = 'PUSH SP\nPOP AX\nINT 0\nEND';

  test('a new machine copies MSX88; setAluMode switches to the 8086 and back', () => {
    const m = createMachine();
    expect(m.aluMode).toBe('msx88');
    expect(setAluMode(m, '8086').aluMode).toBe('8086');
    expect(setAluMode(m, 'z80')).toBe(m);
    expect(createMachine({ aluMode: '8086' }).aluMode).toBe('8086');
  });

  test('the cycle runs the instructions in the chosen mode', () => {
    expect(readReg(runAll(machineFor(PUSH_SP)).cpu, 'AX')).toBe(0);
    const as8086 = start(loadProgram(createMachine({ aluMode: '8086' }), assemble(PUSH_SP)));
    expect(readReg(runAll(as8086).cpu, 'AX')).toBe(0x7ffe);
  });

  test('NOT as 8086 does not highlight the flags (it writes none)', () => {
    const source = 'MOV AL, 1\nNOT AL\nINT 0\nEND';
    const msx88 = stepInstruction(stepInstruction(machineFor(source)));
    expect(msx88.activeComponents).toContain('FLAGS');
    const as8086 = stepInstruction(stepInstruction(setAluMode(machineFor(source), '8086')));
    expect(as8086.activeComponents).toContain('RES');
    expect(as8086.activeComponents).not.toContain('FLAGS');
  });

  test('is kept when loading a program and when stepping back (it is a setting)', () => {
    let m = setAluMode(machineFor('MOV AL, 1\nMOV AL, 2\nINT 0\nEND'), '8086');
    m = loadProgram(m, assemble(PUSH_SP));
    expect(m.aluMode).toBe('8086');
    m = stepInstruction(start(m));
    m = setAluMode(m, 'msx88');
    expect(stepBack(m).aluMode).toBe('msx88');
  });
});
