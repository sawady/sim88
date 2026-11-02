import { describe, expect, test } from 'vitest';
import { createCpu, execute, step, CODE_START, STACK_TOP, MEMORY_SIZE } from '../cpu';
import { decode } from '../decoder';
import { run, reg, flag, byteAt, wordAt, cpuWithCode, hex } from './helpers';

describe('CPU: initial state and memory', () => {
  test('64 KB of memory, registers at 0, IP at 2000h and SP at 8000h', () => {
    const cpu = createCpu();
    expect(cpu.mem).toBeInstanceOf(Uint8Array);
    expect(cpu.mem.length).toBe(MEMORY_SIZE);
    expect(MEMORY_SIZE).toBe(0x10000);
    for (const r of ['AX', 'BX', 'CX', 'DX']) expect(reg(cpu, r)).toBe(0);
    expect(cpu.ip).toBe(CODE_START);
    expect(cpu.regs.SP).toBe(STACK_TOP);
    expect(STACK_TOP).toBe(0x8000);
    expect(cpu.flags).toBe(0);
  });

  test('execution never mutates the previous state; memory is copied only on writes', () => {
    const before = cpuWithCode([0xb0, 0x05, 0x88, 0x07]); // MOV AL, 5 / MOV [BX], AL
    const first = step(before);
    expect(reg(before, 'AL')).toBe(0);
    expect(first.cpu.mem).toBe(before.mem); // no write: shared
    const second = step(first.cpu);
    expect(second.cpu.mem).not.toBe(first.cpu.mem);
    expect(byteAt(second.cpu, 0)).toBe(5);
    expect(byteAt(first.cpu, 0)).toBe(0);
  });

  test('an unknown opcode is a clear error', () => {
    expect(() => step(cpuWithCode([0x0f]))).toThrow(/Unknown opcode 0Fh at 2000h/);
  });

  test('a decoded instruction without an implementation is a clear error', () => {
    const instruction = { ...decode(cpuWithCode([0x90]).mem, CODE_START), mnemonic: 'XLAT' };
    expect(() => execute(createCpu(), instruction)).toThrow(/XLAT is not implemented yet/);
  });
});

describe('CPU: MOV', () => {
  test('8 bit halves compose the 16 bit register', () => {
    const { cpu } = run('MOV AL, 1\nMOV AH, 2\nHLT\nEND');
    expect(reg(cpu, 'AX')).toBe(hex('0201'));
  });

  test('writing a low half keeps the high half (and vice versa)', () => {
    const { cpu } = run('MOV BX, 1234h\nMOV BL, 0FFh\nMOV CX, 1234h\nMOV CH, 0\nHLT\nEND');
    expect(reg(cpu, 'BX')).toBe(hex('12FF'));
    expect(reg(cpu, 'CX')).toBe(hex('0034'));
  });

  test('MOV reg, reg', () => {
    const { cpu } = run('MOV AX, 1234h\nMOV BX, AX\nMOV CL, AH\nMOV DH, BL\nHLT\nEND');
    expect(reg(cpu, 'BX')).toBe(hex('1234'));
    expect(reg(cpu, 'CL')).toBe(hex('12'));
    expect(reg(cpu, 'DH')).toBe(hex('34'));
  });

  test('memory operands: variables, [BX], direct addresses and immediates to memory', () => {
    const { cpu } = run(`
      ORG 1000h
      NUM1 DB 5
      NUM2 DW ?
      NUM3 DB 0
      ORG 2000h
      MOV AL, NUM1
      MOV NUM2, 1234h
      MOV BX, OFFSET NUM3
      MOV [BX], AL
      MOV DX, [1001h]
      MOV WORD PTR [BX], 1006h
      MOV CL, [BX]
      HLT
      END`);
    expect(reg(cpu, 'AL')).toBe(5);
    expect(wordAt(cpu, 0x1001)).toBe(0x1234);
    expect(reg(cpu, 'DX')).toBe(0x1234);
    expect(wordAt(cpu, 0x1003)).toBe(0x1006);
    expect(reg(cpu, 'CL')).toBe(0x06);
  });
});

describe('CPU: END, HLT and INT 0', () => {
  test('HLT stops the CPU; END emits nothing', () => {
    const result = run('MOV AL, 1\nHLT\nEND');
    expect(result.halted).toBe('HLT');
    expect(result.cpu.ip).toBe(CODE_START + 3);
    expect(result.program.memory.size).toBe(3);
  });

  test('INT 0 ends the program', () => {
    const result = run('MOV AL, 1\nINT 0\nMOV AL, 2\nHLT\nEND');
    expect(result.halted).toBe('INT 0');
    expect(reg(result.cpu, 'AL')).toBe(1);
  });

  test('without HLT the CPU keeps running: 00 00 is ADD [BX+SI], AL', () => {
    const { cpu, events } = step(cpuWithCode([0x00, 0x00], { regs: { AX: 3 } }));
    expect(events.halted).toBe(null);
    expect(byteAt(cpu, 0)).toBe(3);
  });

  test('INT 3 is a breakpoint', () => {
    expect(step(cpuWithCode([0xcd, 0x03])).events.breakpoint).toBe(true);
    expect(step(cpuWithCode([0xcc])).events.breakpoint).toBe(true);
  });
});

describe('CPU: ALU instructions and flags', () => {
  test('ADD, SUB, ADC, SBB with registers, immediates and memory', () => {
    const { cpu } = run(`
      ORG 1000h
      A DW 0FFFFh
      B DB 10
      ORG 2000h
      MOV AX, A
      ADD AX, 1      ; 0, C = 1
      MOV DX, 0
      ADC DX, 0      ; 1
      MOV CL, B
      SUB CL, 3      ; 7
      ADD B, CL      ; 17
      SBB BX, BX     ; 0 (C = 0 after ADD B, CL)
      HLT
      END`);
    expect(reg(cpu, 'AX')).toBe(0);
    expect(reg(cpu, 'DX')).toBe(1);
    expect(reg(cpu, 'CL')).toBe(7);
    expect(byteAt(cpu, 0x1002)).toBe(17);
    expect(reg(cpu, 'BX')).toBe(0);
    expect(flag(cpu, 'Z')).toBe(true);
  });

  test('CMP sets the flags without changing the operand', () => {
    const { cpu } = run('MOV AL, 3\nCMP AL, 5\nHLT\nEND');
    expect(reg(cpu, 'AL')).toBe(3);
    expect(flag(cpu, 'C')).toBe(true);
    expect(flag(cpu, 'S')).toBe(true);
    expect(flag(cpu, 'Z')).toBe(false);
  });

  test('AND, OR, XOR, NOT, NEG, INC, DEC', () => {
    const { cpu } = run(`
      MOV AL, 0F0h
      AND AL, 3Ch    ; 30h
      MOV BL, 1
      OR BL, 80h     ; 81h
      MOV CX, 1234h
      XOR CX, CX     ; 0, Z
      MOV DL, 0Fh
      NOT DL         ; 0F0h
      MOV AH, 1
      NEG AH         ; 0FFh
      INC BH         ; 1
      DEC BH         ; 0
      HLT
      END`);
    expect(reg(cpu, 'AL')).toBe(0x30);
    expect(reg(cpu, 'BL')).toBe(0x81);
    expect(reg(cpu, 'CX')).toBe(0);
    expect(reg(cpu, 'DL')).toBe(0xf0);
    expect(reg(cpu, 'AH')).toBe(0xff);
    expect(reg(cpu, 'BH')).toBe(0);
    expect(flag(cpu, 'Z')).toBe(true);
  });

  test('INC and DEC keep the carry flag', () => {
    const { cpu } = run('MOV AL, 0FFh\nADD AL, 1\nINC BL\nHLT\nEND');
    expect(flag(cpu, 'C')).toBe(true);
    expect(flag(cpu, 'Z')).toBe(false);
  });

  test('INC and DEC on memory', () => {
    const { cpu } = run('ORG 1000h\nC DW 0FFFFh\nORG 2000h\nINC C\nMOV BX, 1000h\nINC WORD PTR [BX]\nHLT\nEND');
    expect(wordAt(cpu, 0x1000)).toBe(1);
  });
});

describe('CPU: jumps and labels', () => {
  test('a counting loop: the sum of a table (a typical MSX88 program)', () => {
    const result = run(`
      ORG 1000H
      TABLA DB 1, 2, 3, 4, 5
      CANT  DB 5
      TOTAL DB ?

      ORG 2000H
            MOV AL, 0
            MOV CL, CANT
            MOV BX, OFFSET TABLA
      LAZO: ADD AL, [BX]
            INC BX
            DEC CL
            JNZ LAZO
            MOV TOTAL, AL
            HLT
            END`);
    expect(byteAt(result.cpu, 0x1006)).toBe(15);
    expect(result.halted).toBe('HLT');
  });

  test('UNLP practice 1, exercise 3: count from INI to FIN', () => {
    const { cpu } = run(`
      ORG 1000H
      INI  DB  0
      FIN  DB  15
      ORG  2000H
      MOV  AL, INI
      MOV  AH, FIN
      SUMA: INC  AL
      CMP  AL, AH
      JNZ  SUMA
      HLT
      END`);
    expect(reg(cpu, 'AL')).toBe(15);
  });

  test.each([
    ['JZ', 'MOV AL, 0\nCMP AL, 0', true],
    ['JNZ', 'MOV AL, 0\nCMP AL, 0', false],
    ['JC', 'MOV AL, 0\nCMP AL, 1', true],
    ['JNC', 'MOV AL, 0\nCMP AL, 1', false],
    ['JS', 'MOV AL, 0\nCMP AL, 1', true],
    ['JNS', 'MOV AL, 0\nCMP AL, 1', false],
    ['JO', 'MOV AL, 7Fh\nADD AL, 1', true],
    ['JNO', 'MOV AL, 7Fh\nADD AL, 1', false],
  ])('%s', (jump, setup, taken) => {
    const { cpu } = run(`${setup}\n${jump} SI_SALTA\nMOV DL, 1\nHLT\nSI_SALTA: MOV DL, 2\nHLT\nEND`);
    expect(reg(cpu, 'DL')).toBe(taken ? 2 : 1);
  });

  test('JMP forward and backward', () => {
    const { cpu } = run('JMP ADELANTE\nATRAS: MOV AL, 2\nHLT\nADELANTE: MOV BL, 1\nJMP ATRAS\nEND');
    expect(reg(cpu, 'AL')).toBe(2);
    expect(reg(cpu, 'BL')).toBe(1);
  });
});

describe('CPU: stack, subroutines and interrupts', () => {
  test('PUSH and POP: SP decreases by 2, little endian', () => {
    const { cpu } = run('MOV AX, 1234h\nPUSH AX\nMOV BX, SP\nPOP CX\nHLT\nEND');
    expect(reg(cpu, 'BX')).toBe(0x7ffe);
    expect(wordAt(cpu, 0x7ffe)).toBe(0x1234);
    expect(byteAt(cpu, 0x7ffe)).toBe(0x34);
    expect(reg(cpu, 'CX')).toBe(0x1234);
    expect(cpu.regs.SP).toBe(0x8000);
  });

  test('PUSHF and POPF', () => {
    const { cpu } = run('MOV AL, 0\nCMP AL, 1\nPUSHF\nMOV AL, 1\nCMP AL, 1\nPOPF\nHLT\nEND');
    expect(flag(cpu, 'C')).toBe(true);
    expect(flag(cpu, 'Z')).toBe(false);
  });

  test('CALL and RET: a subroutine with parameters in registers', () => {
    const { cpu } = run(`
      ORG 3000H
      SUMAR: MOV AX, BX
             ADD AX, CX
             RET

      ORG 2000H
             MOV BX, 5
             MOV CX, 7
             CALL SUMAR
             MOV DX, AX
             HLT
             END`);
    expect(reg(cpu, 'DX')).toBe(12);
    expect(cpu.regs.SP).toBe(0x8000);
    expect(wordAt(cpu, 0x7ffe)).toBe(0x2009); // the return address that was pushed
  });

  test('INT n through the vector table, and IRET', () => {
    const { cpu } = run(`
      ID EQU 10
      ORG 40          ; vector 10 = 4 * 10
      DW RUT

      ORG 3000H
      RUT: MOV AL, 5
           IRET

      ORG 2000H
           STI
           INT ID
           MOV BL, AL
           HLT
           END`);
    expect(reg(cpu, 'BL')).toBe(5);
    expect(flag(cpu, 'I')).toBe(true); // restored by IRET
    expect(cpu.regs.SP).toBe(0x8000);
  });

  test('INT 7 writes AL bytes starting at BX', () => {
    const result = run(`
      org 1000H
      mensaje db "Hola"
      org 2000h
      mov bx, offset mensaje
      mov al, 4
      int 7
      int 0
      end`);
    expect(result.output).toBe('Hola');
  });

  test('CLI and STI', () => {
    expect(flag(run('STI\nHLT\nEND').cpu, 'I')).toBe(true);
    expect(flag(run('STI\nCLI\nHLT\nEND').cpu, 'I')).toBe(false);
  });
});

