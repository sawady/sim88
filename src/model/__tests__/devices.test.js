import { describe, expect, test } from 'vitest';
import { assemble } from '../assembler';
import { readReg, getFlag } from '../cpu';
import {
  createMachine,
  loadProgram,
  start,
  stepPhase,
  stepInstruction,
  stepBack,
  pressF10,
  timerPulse,
  toggleSwitch,
} from '../machine';
import { initialDevices, pendingInterrupt, acknowledgeInterrupt, requestInterrupt } from '../devices';
import { pic } from '../devices/pic';
import { pio, pioOutputB } from '../devices/pio';
import { PRINT_INTERVAL } from '../devices/printer';

const machineFor = (source, config = 0) =>
  start(loadProgram(createMachine({ config }), assemble(source)));

// Runs phases until the machine stops, waits, or `until` holds.
const runUntil = (machine, until = () => false, max = 200000) => {
  let m = machine;
  for (let i = 0; i < max; i++) {
    if (m.state !== 'RUNNING' || m.waitingInput || until(m)) return m;
    m = stepPhase(m);
  }
  throw new Error('did not stop');
};
const runInstructions = (machine, n) => {
  let m = machine;
  for (let i = 0; i < n; i++) m = stepInstruction(m);
  return m;
};

const PORTS = `
PIC  EQU 20h
EOI  EQU 20h
IMR  EQU 21h
INT0 EQU 24h
INT1 EQU 25h
INT2 EQU 26h
INT3 EQU 27h
CONT EQU 10h
COMP EQU 11h
PA   EQU 30h
PB   EQU 31h
CA   EQU 32h
CB   EQU 33h
DATO EQU 40h
EST  EQU 41h
`;

describe('PIO (configuration 0): switches and LEDs', () => {
  test('all bits are inputs after reset', () => {
    const d = initialDevices(0);
    expect(d.pio).toEqual({ pa: 0, pb: 0, ca: 0xff, cb: 0xff });
  });

  test('input bits read the switches, output bits the latch', () => {
    let d = { ...initialDevices(0), switches: 0b1010_0101 };
    expect(pio.read(d, 0x30)).toBe(0b1010_0101);
    d = pio.write(d, 0x32, 0x0f); // PA high nibble as output
    d = pio.write(d, 0x30, 0xff);
    expect(pio.read(d, 0x30)).toBe(0xf5);
    expect(pio.read(d, 0x32)).toBe(0x0f);
  });

  test('a program copies the switches to the LEDs', () => {
    let m = machineFor(`${PORTS}
      ORG 2000h
            MOV AL, 0FFh
            OUT CA, AL      ; PA: inputs (switches)
            MOV AL, 0
            OUT CB, AL      ; PB: outputs (LEDs)
      LAZO: IN AL, PA
            OUT PB, AL
            JMP LAZO
            END`);
    m = toggleSwitch(toggleSwitch(m, 0), 7);
    m = runInstructions(m, 10);
    expect(pioOutputB(m.devices)).toBe(0x81);
    m = toggleSwitch(m, 7);
    m = runInstructions(m, 3);
    expect(pioOutputB(m.devices)).toBe(0x01);
  });

  test('LEDs only show output bits', () => {
    let d = initialDevices(0);
    d = pio.write(d, 0x31, 0xff);
    expect(pioOutputB(d)).toBe(0); // PB still all inputs
    d = pio.write(d, 0x33, 0xf0);
    expect(pioOutputB(d)).toBe(0x0f);
  });

  test('the switches keep their position when the program is loaded again', () => {
    const m = toggleSwitch(createMachine(), 3);
    expect(loadProgram(m, assemble('HLT\nEND')).devices.switches).toBe(8);
  });
});

describe('PIC', () => {
  test('registers: IMR, IRR, ISR and the vector of each line', () => {
    let d = initialDevices(0);
    d = pic.write(d, 0x21, 0xfe);
    d = pic.write(d, 0x24, 10);
    d = pic.write(d, 0x2b, 99);
    expect([pic.read(d, 0x21), pic.read(d, 0x24), pic.read(d, 0x2b)]).toEqual([0xfe, 10, 99]);
  });

  test('priority: INT0 first; masked lines wait; in-service blocks lower priorities', () => {
    let d = initialDevices(0);
    d = requestInterrupt(requestInterrupt(d, 3), 1);
    expect(pendingInterrupt(d)).toBe(1);
    d = pic.write(d, 0x21, 0b0010); // mask INT1
    expect(pendingInterrupt(d)).toBe(3);
    d = pic.write(d, 0x21, 0);
    ({ devices: d } = acknowledgeInterrupt(d, 1));
    expect(pic.read(d, 0x23)).toBe(0b0010); // ISR
    expect(pic.read(d, 0x22)).toBe(0b1000); // IRR
    expect(pendingInterrupt(d)).toBe(null); // INT3 waits for the EOI of INT1
    d = requestInterrupt(d, 0);
    expect(pendingInterrupt(d)).toBe(0); // higher priority: nested
    ({ devices: d } = acknowledgeInterrupt(d, 0));
    d = pic.write(d, 0x20, 0x20); // EOI: clears INT0
    d = pic.write(d, 0x20, 0x20); // EOI: clears INT1
    expect(pendingInterrupt(d)).toBe(3);
  });

  test('F10 interrupts the program through INT0 and IRET returns', () => {
    let m = machineFor(`${PORTS}
      N_F10 EQU 10
      ORG 40              ; vector 10
      DW RUT_F10

      ORG 3000h
      RUT_F10: INC DX
               MOV AL, EOI
               OUT PIC, AL
               IRET

      ORG 2000h
            CLI
            MOV AL, 0FEh    ; only INT0
            OUT IMR, AL
            MOV AL, N_F10
            OUT INT0, AL
            MOV DX, 0
            STI
      LAZO: JMP LAZO
            END`);
    m = runInstructions(m, 10);
    expect(readReg(m.cpu, 'DX')).toBe(0);
    m = pressF10(m);
    m = stepPhase(m); // accepts the interrupt instead of fetching
    expect(m.decoder).toBe('INT0 → tipo 10');
    expect(m.cpu.ip).toBe(0x3000);
    expect(getFlag(m.cpu, 'I')).toBe(false);
    expect(m.devices.pic.isr).toBe(1);
    m = runInstructions(m, 4);
    expect(readReg(m.cpu, 'DX')).toBe(1);
    expect(getFlag(m.cpu, 'I')).toBe(true);
    expect(m.devices.pic.isr).toBe(0);
    expect(m.cpu.regs.SP).toBe(0x8000);
    m = runInstructions(pressF10(m), 6);
    expect(readReg(m.cpu, 'DX')).toBe(2);
  });

  test('without STI the request waits in IRR', () => {
    let m = machineFor('LAZO: JMP LAZO\nEND');
    m = runInstructions(pressF10(m), 5);
    expect(m.cpu.ip).toBe(0x2000);
    expect(m.devices.pic.irr).toBe(1);
  });

  test('step back undoes the acceptance of an interrupt', () => {
    let m = machineFor('ORG 40\nDW RUT\nORG 3000h\nRUT: IRET\nORG 2000h\nMOV AL, 10\nOUT 24h, AL\nSTI\nL: JMP L\nEND');
    m = runInstructions(m, 4);
    m = stepPhase(pressF10(m));
    expect(m.cpu.ip).toBe(0x3000);
    m = stepBack(m);
    expect(m.cpu.ip).not.toBe(0x3000);
    expect(m.devices.pic.irr).toBe(1);
  });
});

describe('HLT', () => {
  test('ends the program when no interrupt can arrive (I = 0)', () => {
    const m = runUntil(machineFor('MOV AL, 1\nHLT\nEND'));
    expect(m.state).toBe('STOPPED');
    expect(m.message).toMatch(/terminado \(HLT\)/);
  });

  test('ends the program when every connected line is masked', () => {
    const m = runUntil(machineFor('MOV AL, 0FFh\nOUT 21h, AL\nSTI\nHLT\nEND'));
    expect(m.state).toBe('STOPPED');
  });

  test('with interrupts enabled, waits for one and continues after IRET', () => {
    let m = machineFor(`${PORTS}
      ORG 40
      DW RUT
      ORG 3000h
      RUT: MOV BL, 1
           MOV AL, EOI
           OUT PIC, AL
           IRET
      ORG 2000h
           MOV AL, 10
           OUT INT0, AL
           STI
           HLT
           MOV CL, 2
           INT 0
           END`);
    m = runInstructions(m, 4);
    expect(m.cpuHalted).toBe(true);
    expect(m.state).toBe('RUNNING');
    expect(m.message).toMatch(/espera una interrupción/);
    const ip = m.cpu.ip;
    m = runInstructions(m, 20); // nothing happens while halted
    expect(m.cpu.ip).toBe(ip);
    m = runUntil(pressF10(m));
    expect(readReg(m.cpu, 'BL')).toBe(1);
    expect(readReg(m.cpu, 'CL')).toBe(2);
    expect(m.message).toMatch(/INT 0/);
  });
});

describe('TIMER', () => {
  test('counts pulses and interrupts through INT1 when CONT reaches COMP', () => {
    let m = machineFor(`${PORTS}
      ID_TIMER EQU 13
      ORG 52               ; vector 13
      DW RUT_TIMER
      ORG 1000h
      VECES DB 0
      ORG 3000h
      RUT_TIMER: INC VECES
                 MOV AL, 0
                 OUT CONT, AL
                 MOV AL, EOI
                 OUT PIC, AL
                 IRET
      ORG 2000h
            CLI
            MOV AL, ID_TIMER
            OUT INT1, AL
            MOV AL, 11111101b   ; only the timer
            OUT IMR, AL
            MOV AL, 3
            OUT COMP, AL
            MOV AL, 0
            OUT CONT, AL
            STI
      LAZO: JMP LAZO
            END`);
    m = runInstructions(m, 12);
    m = runInstructions(timerPulse(timerPulse(m)), 3);
    expect(m.devices.timer.cont).toBe(2);
    expect(m.cpu.mem[0x1000]).toBe(0);
    m = runInstructions(timerPulse(m), 8);
    expect(m.cpu.mem[0x1000]).toBe(1);
    expect(m.devices.timer.cont).toBe(0);
    for (let i = 0; i < 3; i++) m = runInstructions(timerPulse(m), 8);
    expect(m.cpu.mem[0x1000]).toBe(2);
  });
});

const MESSAGE = 'ORG 1000h\nMSJ DB "HOLA MUNDO"\nFIN DB ?\n';

describe('printer through the PIO (configuration 1)', () => {
  test('a polling program prints a string, waiting while BUSY', () => {
    const m = runUntil(
      machineFor(
        `${PORTS}
        ${MESSAGE}
        ORG 2000h
              MOV AL, 11111101b   ; PA0 BUSY input, PA1 STROBE output
              OUT CA, AL
              MOV AL, 0           ; PB: data, outputs
              OUT CB, AL
              IN AL, PA
              AND AL, 11111101b   ; STROBE = 0
              OUT PA, AL
              MOV BX, OFFSET MSJ
              MOV CL, OFFSET FIN - OFFSET MSJ
        POLL: IN AL, PA
              AND AL, 1
              JNZ POLL
              MOV AL, [BX]
              OUT PB, AL
              IN AL, PA
              OR AL, 00000010b    ; STROBE = 1: the printer takes PB
              OUT PA, AL
              IN AL, PA
              AND AL, 11111101b   ; STROBE = 0
              OUT PA, AL
              INC BX
              DEC CL
              JNZ POLL
        ESPERA: INC DX          ; let the printer empty its buffer
              CMP DX, 200
              JNZ ESPERA
              INT 0
              END`,
        1
      )
    );
    expect(m.message).toMatch(/INT 0/);
    expect(m.devices.printer.paper).toBe('HOLA MUNDO');
  });
});

describe('HAND and printer (configuration 2)', () => {
  test('polling the BUSY bit', () => {
    const m = runUntil(
      machineFor(
        `${PORTS}
        ${MESSAGE}
        ORG 2000h
              IN AL, EST
              AND AL, 7Fh         ; no interrupts
              OUT EST, AL
              MOV BX, OFFSET MSJ
        POLL: IN AL, EST
              AND AL, 1
              JNZ POLL
              MOV AL, [BX]
              OUT DATO, AL
              INC BX
              CMP BX, OFFSET FIN
              JNZ POLL
        ESPERA: INC DX
              CMP DX, 200
              JNZ ESPERA
              INT 0
              END`,
        2
      )
    );
    expect(m.devices.printer.paper).toBe('HOLA MUNDO');
  });

  test('by interrupts through INT2: one character per interrupt', () => {
    const m = runUntil(
      machineFor(
        `${PORTS}
        ID_HAND EQU 10
        ORG 40
        DW IMPRIMIR
        ${MESSAGE}
        ORG 3000h
        IMPRIMIR: MOV AL, [BX]
                  OUT DATO, AL
                  INC BX
                  CMP BX, OFFSET FIN
                  JNZ SEGUIR
                  IN AL, EST       ; last one: disable the HAND's interrupts
                  AND AL, 7Fh
                  OUT EST, AL
                  MOV CH, 1        ; done
        SEGUIR:   MOV AL, EOI
                  OUT PIC, AL
                  IRET
        ORG 2000h
              CLI
              MOV AL, 11111011b   ; only INT2
              OUT IMR, AL
              MOV AL, ID_HAND
              OUT INT2, AL
              MOV BX, OFFSET MSJ
              MOV CH, 0
              IN AL, EST
              OR AL, 80h          ; interrupts on
              OUT EST, AL
              STI
        LAZO: CMP CH, 1
              JNZ LAZO
        ESPERA: INC DX
              CMP DX, 200
              JNZ ESPERA
              INT 0
              END`,
        2
      )
    );
    expect(m.message).toMatch(/INT 0/);
    expect(m.devices.printer.paper).toBe('HOLA MUNDO');
  });
});

describe('CDMA (configuration 3)', () => {
  const DMA = `${PORTS}
    RFL EQU 50h
    RFH EQU 51h
    CONTL EQU 52h
    CONTH EQU 53h
    RDL EQU 54h
    RDH EQU 55h
    CTRL EQU 56h
    ARRANQUE EQU 57h
  `;

  test('memory to memory, one byte per instruction, TC requests INT3', () => {
    let m = machineFor(
      `${DMA}
      ID_DMA EQU 20
      ORG 80
      DW FIN_DMA
      ORG 1000h
      ORIGEN DB 1, 2, 3, 4
      ORG 1100h
      DESTINO DB 4 DUP (0)
      ORG 3000h
      FIN_DMA: MOV CH, 1
               MOV AL, EOI
               OUT PIC, AL
               IRET
      ORG 2000h
            CLI
            MOV AL, 11110111b     ; only INT3
            OUT IMR, AL
            MOV AL, ID_DMA
            OUT INT3, AL
            MOV AX, OFFSET ORIGEN
            OUT RFL, AL
            MOV AL, AH
            OUT RFH, AL
            MOV AX, OFFSET DESTINO
            OUT RDL, AL
            MOV AL, AH
            OUT RDH, AL
            MOV AL, 4
            OUT CONTL, AL
            MOV AL, 0
            OUT CONTH, AL
            MOV AL, 00001010b     ; block, memory to memory
            OUT CTRL, AL
            STI
            OUT ARRANQUE, AL
      LAZO: CMP CH, 1
            JNZ LAZO
            IN AL, CTRL
            INT 0
            END`,
      3
    );
    m = runUntil(m);
    expect(m.message).toMatch(/INT 0/);
    expect([...m.cpu.mem.slice(0x1100, 0x1104)]).toEqual([1, 2, 3, 4]);
    expect(readReg(m.cpu, 'AL') & 0x80).toBe(0x80); // TC
    expect(m.devices.cdma.cont).toBe(0);
  });

  test('memory to the printer on demand of the HAND', () => {
    const m = runUntil(
      machineFor(
        `${DMA}
        ${MESSAGE}
        ORG 2000h
              MOV AX, OFFSET MSJ
              OUT RFL, AL
              MOV AL, AH
              OUT RFH, AL
              MOV AL, OFFSET FIN - OFFSET MSJ
              OUT CONTL, AL
              MOV AL, 0
              OUT CONTH, AL
              MOV AL, 00000100b   ; on demand, memory -> peripheral
              OUT CTRL, AL
              MOV AL, 80h         ; HAND: INT line on (DREQ)
              OUT EST, AL
              OUT ARRANQUE, AL
        ESPERA: IN AL, CTRL
              AND AL, 80h
              JZ ESPERA
        VACIAR: INC DX
              CMP DX, 200
              JNZ VACIAR
              INT 0
              END`,
        3
      )
    );
    expect(m.devices.printer.paper).toBe('HOLA MUNDO');
  });
});

describe('printer', () => {
  test('wraps at 20 columns and handles CR LF', () => {
    const m = runUntil(
      machineFor(
        `ORG 1000h
        T DB "12345678901234567890AB", 13, 10, "C"
        F DB ?
        ORG 2000h
              MOV BX, OFFSET T
        L:    IN AL, 41h
              AND AL, 1
              JNZ L
              MOV AL, [BX]
              OUT 40h, AL
              INC BX
              CMP BX, OFFSET F
              JNZ L
              MOV CX, ${PRINT_INTERVAL * 10}
        W:    DEC CX
              JNZ W
              INT 0
              END`,
        2
      )
    );
    expect(m.devices.printer.paper).toBe('12345678901234567890\nAB\nC');
  });
});
