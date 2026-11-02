# SIM88 progress

This file is the source of truth for the work on SIM88: what is planned, in which order, and
what is done. Tasks are ordered by dependency inside each phase. A task is ticked in the same
commit that finishes it.

GitHub issues are for people outside the project (bug reports, questions, proposals); day to day
work is tracked here. See [CONTRIBUTING.md](CONTRIBUTING.md).

Conventions:

- `gfi`: good first issue (small, self contained, guided by a test).
- "Deps" refers to task numbers in this file.
- Base acceptance criterion for every task: its `test.fails` / `test.todo` (if any) becomes a
  passing test, new behavior has tests, and CI is green.
- ⚠️ marks behavior where fidelity to MSX88 is not confirmed yet (see "Open questions").

## Decisions

Taken by Federico Sawady on 2026-11-02.

1. **Faithful to MSX88**, the classroom simulator used in many courses: its syntax, `ORG 1000h`
   for data and `ORG 2000h` for code, its I/O and interrupt conventions (INT 0 ends the program,
   INT 3 is a breakpoint, INT 6 reads a character, INT 7 writes a block, as in
   [Roadmap.md](Roadmap.md)) and its memory map. Where MSX88 behavior is unclear, public course
   material is used and the doubt is recorded below.
2. **Real 8086 opcodes**, with a table-driven decoder that reads ModRM.
3. **`END` and `HLT`**: `END` is an assembler directive that marks the end of the source and emits
   no code; `HLT` (F4) halts the CPU; `INT 0` also ends the program, as in MSX88. Opcode 00 decodes
   as `ADD r/m8, r8`, as on an 8086. *Updated 2026-11-02 with the oracle (task 47):* `HLT` waits for
   an interrupt even when none can come, as MSX88 does; `00 00` (`[BX+SI]`) is not an SX88
   instruction and stops the program, as MSX88 does (`00 07`, `ADD [BX], AL`, runs).
4. **64 KB of memory on a `Uint8Array`**, with a snapshot per step (enables "step back").
5. **Fidelity rule** (adjusts decision 2): where MSX88 / ASM88 is documented, SIM88 copies
   MSX88 even when it differs from a real 8086; real 8086 opcodes are used only where MSX88 says
   nothing. Reason: students compare with the `.LST` listings and the course material. So `JMP`
   and `CALL` carry an absolute address (`E9`/`E8`, as ASM88) and `NOP` is 98h (MSX88 manual).
   *Updated 2026-11-02:* the original MSX88 is now the reference ([docs/fidelity.md](docs/fidelity.md)):
   ASM88 emits `NOP` as 90h, so SIM88 does too; where MSX88 differs from the 8086 and from its
   own manual (ADC/SBB with carry, INC/DEC and C, NOT and the flags, `PUSH SP`), SIM88 copies
   MSX88. *Updated 2026-11-02 (task 49):* those four are a setting, Options › ALU, "as MSX88"
   (the default, because it matches the original) or "as 8086", to discuss them in class.
6. **SIM88 extensions** (`'A'`, single-quoted strings, `[1000h]`, `*` and `/`) are kept and
   documented as extensions; **MSX88 strict mode** (a toggle in the UI) rejects them. The extra
   assembler errors (missing `END`, no code at 2000h) are kept.

## Phase 0: assembler bugs

- [x] **1. Normalize register names to upper case** · `gfi`
  `mov al, 1` assembles like `MOV AL, 1`.
- [x] **2. Accept CRLF line endings** · `gfi`
  Files saved on Windows parse.
- [x] **3. PUSHF/POPF are zero operand instructions** · `gfi`
  Keywords need a word boundary; a register does not match the prefix of a name (`AXIS`).
- [x] **4. Allow an empty program (just `END`)** · `gfi`
- [x] **5. Initial values of the registers and SP** · `gfi`
  Registers start at 0 and SP at 8000h, the top of the user memory ⚠️ (open question 3).
- [x] **6. Friendly errors for unsupported instructions**
  Never a `TypeError`: unknown or not yet implemented instructions give a message with the line.
- [x] **7. Size and range checks** · Deps: 6
  `MOV AL, BX` and `MOV AL, 300` are errors with the line.
- [x] **8. Decode MOV reg, reg (8A/8B + ModRM)**
  The cycle runs `MOV BX, AX`.
- [x] **9. Remove the debug panel from the UI** · `gfi`
  No "RESULTADO AST / COMPILED"; errors are shown with error styling.

## Phase 1: memory and two-pass assembler

- [x] **10. 64 KB memory and virtualized view** · Deps: decision 4
  0000h–FFFFh on a `Uint8Array`, O(1) access, a snapshot per step. The memory view is virtualized
  and follows IP; the UI is fluid at maximum speed.
- [x] **11. Two-pass assembler with a symbol table** · Deps: 6
  Pass 1 computes addresses of labels (`LOOP:`), variables and constants; pass 2 emits bytes.
  The assembler returns an address → source line map (used by 33).
- [x] **12. ORG directive** · Deps: 10, 11
  Several ORG blocks, code and data in separate areas, error if two blocks overlap. Execution
  starts at 2000h.
- [x] **13. DB/DW: `?`, lists and strings** · Deps: 11, 12
  `DB ?` reserves a byte; `DW` is little endian; `TABLE DB 1, 2, 4, 8`; `MSG DB "hello"`.
- [x] **14. EQU** · Deps: 11
  Constants are replaced wherever an immediate is accepted and take no memory.
- [x] **15. `END` as a directive and `HLT` to halt** · Deps: 11
  As in decision 3. The default example and the tests are updated.

## Phase 2: addressing modes

- [x] **16. Opcode table decoder + ModRM** · Deps: 8
  Adding an instruction means adding table rows. A decoded instruction without an implementation
  stops the machine with a clear error.
- [x] **17. Memory operands: direct, indirect through BX, immediate to memory** · Deps: 10, 11, 16
  `MOV AL, VAR`, `MOV [1000h], AX`, `MOV AX, [BX]`, `MOV VAR, 5`, encoded as on the 8086
  (`[BX]` is mod=00 r/m=111; direct is mod=00 r/m=110 + disp16). Memory to memory is rejected.
  `BYTE PTR` / `WORD PTR` when the size is not given by a register or a variable. `[BX + n]` is
  rejected because MSX88 does not have it (the decoder does understand it).

## Phase 3: ALU and flags

- [x] **18. Pure ALU with flags (`src/model/alu.js`)** · `gfi`
  8 and 16 bit ADD, ADC, SUB, SBB, CMP, AND, OR, XOR, NEG, NOT, INC, DEC with Z, S, O, C, A, P.
  Exhaustive edge case tests.
- [x] **19. NOT in the grammar** · `gfi`
- [x] **20. ALU in the cycle and the UI** · Deps: 16, 17, 18, 19
  The instructions of 18 assemble, decode and run with every operand kind of 17; the UI shows
  flags and the real OP1/OP2/RES.

## Phase 4: control flow and stack

- [x] **21. JMP and conditional jumps (IP relative)** · Deps: 11, 20
  `JMP`, `JZ`, `JNZ`, `JS`, `JNS`, `JC`, `JNC`, `JO`, `JNO`; error when the target is out of
  range. Tested with a counting loop.
- [x] **22. Stack: PUSH, POP, PUSHF, POPF** · Deps: 3, 5, 10, 16
  SP decreases by 2, little endian. The UI highlights SP and the stack area.
- [x] **23. CALL and RET** · Deps: 21, 22
  A subroutine with parameters in registers, with a test.

## Phase 5: interrupts and I/O

- [x] **24. INT, IRET, STI, CLI and the vector table** · Deps: 22, 10
  256 vectors in the first KB; `INT n` pushes flags and IP and jumps; IRET returns. STI/CLI set I.
- [x] **25. System interrupts 0, 3, 6 and 7, and a console in the UI** · Deps: 24
  INT 0 ends, INT 3 is a breakpoint (pause), INT 6 reads a character into `[BX]`, INT 7 writes
  AL bytes from BX to a console.
  The screen takes the keyboard while INT 6 waits; keys typed earlier are buffered.
- [x] **26. IN, OUT and an I/O bus** · Deps: 16
  Port map with an interface to plug peripherals (`src/model/io.js`); device state lives in the
  machine, so step back undoes I/O. Unmapped ports read FFh ⚠️ (open question 8).
- [x] **27. PIO, LED bar and switches** · Deps: 26
  MSX88 configurations 0–3 selectable in the toolbar; PIO at 30h–33h (CA/CB: 1 = input);
  configuration 0 has switches on PA (buttons or keys 0–7) and LEDs on PB.
- [x] **28. PIC and the INT/NMI lines** · Deps: 24, 26
  PIC at 20h–2Bh (EOI, IMR, IRR, ISR, INT0–INT7 vectors), fixed priority with nesting, F10 on
  INT0. The CPU accepts a request between instructions when I = 1 (shown as its own step).
  `HLT` waits for an interrupt when one can arrive, else it ends the program. NMI: not used by
  any MSX88 peripheral, not implemented.
- [x] **29. Timer** · Deps: 28
  CONT/COMP at 10h–11h, 1 Hz clock in real time while running (and a "Pulso" button), INT1.
- [x] **30. Handshake and Centronics printer** · Deps: 26, 28
  Printer of 20 columns with a 5 character buffer, through the PIO (configuration 1: PA0 BUSY,
  PA1 STROBE, PB data) or the HAND (40h–41h; configuration 2, by polling or by INT2).
- [x] **31. CDMA** · Deps: 30, 10
  50h–57h, configuration 3: memory to memory, and memory to/from the HAND on demand (DREQ is
  the HAND's INT line); TC requests INT3.

## UX and infrastructure (can run in parallel)

- [x] **32. "Step" (one instruction) and "micro-step" (one cycle phase) buttons** · `gfi`
  Buttons and shortcuts, execution without a timer, reducer tests. Includes "step back" (decision 4).
  F7 step and F6 micro-step (as MSX88), Shift+F7 back.
- [x] **33. Highlight the running line in the editor** · Deps: 11
- [x] **34. Keep the program in localStorage** · `gfi`
- [x] **35. Loadable examples** · `gfi`
  A menu with example programs from `src/examples/`, one per course topic; each selects the
  configuration it needs (`; conexionado: N`) and is tested in strict mode.
- [x] **36. i18n es/en**
  `src/i18n` (dictionaries `es.js` / `en.js`, `t()`, `useT()`); Options › Language, the browser's
  language by default, remembered. Assembler and simulator messages are translated by pattern
  (`messages.js`); tests check that both dictionaries have the same keys and that every message
  in `src/model` has a pattern.
- [x] **37. Screenshot and GIF for the README** · `gfi` · Deps: 9
  `docs/demo.gif` and `docs/screenshots/` (one per theme, English, menu, dialog).
- [x] **38. Load Ace in a separate chunk** · `gfi`
  The main chunk is below 500 kB. (Main ~300 kB; the editor loads in its own ~590 kB chunk.)
- [x] **39. UI tests with Testing Library** · `gfi`
  A smoke test renders the App with the store and runs a program with fake timers.
  (`src/components/__tests__/App.test.jsx`, jsdom; Ace is replaced by a textarea.)
- [ ] **40. Incremental TypeScript migration** · Deps: 16
  `allowJs` + `checkJs` on `src/model` first, then file by file.
- [x] **41. Text mode interface, in the style of the MS-DOS tools of the time**
  IBM VGA 8x16 font (Ultimate Oldschool PC Font Pack, CC BY-SA 4.0, downloaded at install by
  `scripts/fetch-font.mjs`), a character grid scaled by whole factors, menu bar with pull-down
  menus (Alt + letter, arrows, mouse), function key bar, windows with double frames and shadows
  (Alt+1..5), dialogs with focus kept inside, and an Ace theme of its own. Small screens stack the
  windows. Tests: `src/components/__tests__/App.test.jsx`, `tui/__tests__`.
- [x] **42. Themes** · Deps: 41
  Classic blue (Borland), MSX88 (after a v3.0 screenshot), green phosphor, amber phosphor, high
  contrast, as CSS variables in `src/styles/themes.css`; optional CRT effect; Options ›
  Appearance, remembered. A test checks WCAG contrast of every theme.
- [x] **43. Configurable timer and printer speed**
  Options › Frequencies: timer at 1 Hz by default (0.5, 1, 2, 5, 10 or 0.1–50 Hz) and printer at
  one character every 8 instructions by default (1–1000).
- [ ] **44. Example programs in English** · `gfi` · Deps: 36
  The examples' comments and strings are in Spanish; the English UI could load English versions.
- [ ] **45. Visual checks of the themes in CI** · Deps: 42
  Screenshots with Playwright against `vite preview` (today they are taken by hand).
- [ ] **46. A layout for phones** · Deps: 41
  Small screens stack the windows and scroll; a touch friendly layout (bigger keys, the function
  key bar as buttons) would help.
- [x] **47. Fidelity checked against the original MSX88** · Deps: 18–31
  `tools/oracle` runs MSX88 V-3.1, ASM88 and LINK88 (from `MSX88Portable.zip`, downloaded and
  checked by hash, never committed) in QEMU + FreeDOS inside Docker, drives MSX88 with keys and
  reads its state from its memory and screen. `tests/fidelity/programs` has 70 programs (every
  instruction and addressing mode, flags at the edges, directives, stack, CALL/RET, jumps,
  INT 0/3/6/7, PIO, PIC, timer, HAND, CDMA, assembler errors); their golden results are in
  `tests/fidelity/golden` and `src/model/__tests__/fidelity.test.js` compares SIM88 with them.
  Report: [docs/fidelity.md](docs/fidelity.md) (63 of 65 compared programs match).
- [ ] **48. Read the printer's paper in the oracle** · Deps: 47
  Compare what MSX88 prints (F5 shows the paper), the HAND by interrupts and the CDMA with the
  printer; the PIO printer (configuration 1).
- [x] **49. Setting "ALU: as MSX88 / as 8086"** · Deps: 47
  The four places where MSX88 differs from the 8086 (INC/DEC and C, ADC/SBB with C = 1, NOT and
  the flags, `PUSH SP`) follow the setting `aluMode`: `msx88` (default) or `8086`. `alu.js`
  exports both sets (`ALU_MODES`); `execute()` takes `{ aluMode }`; the machine keeps the mode
  (`SET_ALU_MODE`, like the printer speed) across resets, configurations and step back.
  Options › ALU picks it, Help › Differences from the 8086 explains it, the status bar shows
  `ALU 8086`. The fidelity corpus runs as MSX88 (63 of 65; 8 programs differ as 8086).
- [x] **50. Show the HLT wait clearly**
  While the CPU waits after `HLT`, the status bar says "CPU detenida (HLT): esperando
  interrupción — Esc para terminar" (in the message colors, keeping only F10 and Esc), and the
  CPU window shows "■ HLT: esperando interrupción" instead of the next phase.

## Open questions (MSX88 fidelity)

Since 2026-11-02 the questions are settled by running the original MSX88 (task 47): the
evidence of each answer is a program in `tests/fidelity/programs`, and
[docs/fidelity.md](docs/fidelity.md) has the full report.

Resolved by Federico on 2026-11-02 (decisions 5 and 6): JMP/CALL absolute, SP starts at 8000h,
extensions kept with a strict mode, extra assembler errors kept.

Resolved with the oracle on 2026-11-02:

1. **Initial registers and flags**: registers 0, SP 8000h, IP 2000h, **flags 0200h (I = 1)**.
   Memory: zero except the monitor's vectors of INT 0/3/6/7 (`init-state`).
2. **Names are case sensitive** in ASM88 (`asm-case-labels`): MSX88 strict mode is now too; the
   default mode still ignores case. Mnemonics, registers and directives can be in lower case.
3. **INT 6 does not echo** the key; Enter is 0Dh (`int6-input`).
4. **INT 3** returns to the monitor with IP after it (`int3-breakpoint`); SIM88 pauses.
5. **`DB ?`**: ASM88 puts in the executable whatever its buffer had (the bytes the `.LST`
   shows), so MSX88 loads them. SIM88 leaves the memory alone (not compared).
6. **Encodings**: ASM88 never emits the short forms, and `NOP` is 90h (`asm-encodings`, `nop`).
   Whether MSX88 runs short forms written as bytes is still open.
7. **INT 0/3/6/7 go through the stack**: the flags and IP are pushed, the vector leads to an IRET
   the monitor keeps at 4n+2, and the monitor does its job in between (`int0-stack`,
   `int7-zero`). A program that replaces the vector gets its own routine
   (`int-vector-0-replaced`).
8. **Unmapped I/O ports read 00h** (`io-ports-initial-c0`).
9. **HLT** waits for an interrupt even with I = 0 or every line masked: only ESC ends it
   (`hlt-cli`, `hlt-sti`).
10. **Timer**: the clock is real time, not tied to the instructions (`exp-timer-speed-*`), and
    the timer does not reset CONT by itself (`timer-cont-reset`).
11. **Printer**: BUSY goes to 1 when the 4th character is waiting (`exp-printer-buffer`), and it
    prints in real time.
13. **CDMA**: reading 57h also starts a transfer; memory to memory in block mode moves the whole
    block at once; CTRL reads 80h (TC = 1) after a reset (`cdma-*`, `io-ports-initial-c3`).
14. **Hardware interrupts with type 0, 3, 6 or 7** go through the vector table and only run the
    monitor's IRET: no end of program, no output (`pic-hw-type-0`, `pic-hw-type-7`).
16. **The PIC masks every line after a reset** (IMR = FFh), and **PB of the PIO** reads back its
    latch on every bit (`io-ports-initial-c0`, `pio-pb-input`).
17. **INT 7** writes one line per call, shows CR and LF as symbols and wraps at 60 columns
    (`int7-*`).

Still open:

12. **HAND interrupts** are level triggered: the request stays while bit 7 is set and the printer
    is not busy (so after the EOI the next character is requested). Not checked yet (task 48).
15. **Configuration 1 printer**: STROBE is PA1 and a character is taken on its rising edge. Not
    checked yet (task 48).
18. **Printer and timer speed**: MSX88 runs them on the wall clock; SIM88 keeps them on the
    settings of Options › Frequencies (the printer by instructions). `hand-printer-polling`
    differs because of that.
19. **8086 short forms and BP/SI/DI written as bytes**: not known whether MSX88 runs them.

## Log

- 2026-11-02: ALU setting, as MSX88 (default) or as 8086 (task 49), explained in Options › ALU,
  Help › Differences from the 8086, the README and docs/fidelity.md; the HLT wait has its own
  state in the status bar and the CPU window (task 50).

- 2026-11-02: MSX88 oracle and fidelity corpus (task 47). SIM88 now follows MSX88 in: I = 1 at
  start, the monitor's vectors and INT 0/3/6/7 through the stack, INT 7 one line per call, HLT
  always waits, NOP 90h, ADC/SBB/INC/DEC/NOT flags, `PUSH SP`, unknown ModRM modes stop, case
  sensitive names in strict mode, `DUP` without a count, IMR FFh, unmapped ports 00h, PB latch,
  CDMA start by reading 57h and block mode at once, a printer buffer of 4.
  *Note for the interface:* `machine.output` now ends every INT 7 call with `\n`, and `HLT`
  leaves the machine RUNNING with `cpuHalted` (the "HLT: la CPU espera..." message) instead of
  stopping it; the App and reducer tests were adjusted to that, and the printer speed test now
  fills a 4 character buffer.

- 2026-11-02: new text mode interface (tasks 41–42): VGA font, menus, function key bar, windows
  with double frames and shadows, dialogs, five themes and a CRT effect; Spanish and English
  (task 36), assembler errors included; Options › Frequencies for the timer and the printer
  (task 43); README GIF and screenshots (task 37). Fixed: the first visit could show an empty
  editor. Checked in headless Chromium at 390x844, 1024x640, 1366x768, 1536x864 (pixel ratio
  1.25), 1920x1080 and 2560x1440, in every theme, with no console errors.

- 2026-11-02: README screenshot (task 37, GIF pending). Fixed: a switch, F10, timer pulse or key
  arriving between the operands and execute phases was lost.

- 2026-11-02: the Ace editor loads lazily (task 38) and a UI smoke test covers running, errors,
  stepping and the switches (task 39).

- 2026-11-02: the program is kept in localStorage (task 34); "Ejemplos" menu with 9 programs:
  table sum, subroutines, screen and keyboard, F10, timer, LEDs, printer through the PIO and the
  HAND, DMA (task 35).

- 2026-11-02: peripherals (tasks 27–31): the four MSX88 configurations, PIO with LEDs and
  switches, PIC with F10 and the HLT rule, timer, printer through the PIO or the HAND, CDMA.
  Peripherals panel in the UI. Checked in headless Chromium: switches to LEDs, F10 interrupt,
  printing with the HAND, strict mode.

- 2026-11-02: fidelity rule (decision 5): absolute `JMP`/`CALL`, `NOP` = 98h; MSX88 strict mode
  (decision 6); MSX88 shortcuts (F5 run/pause, F6 cycle step, F7 instruction step, Esc stop,
  + and - speed).

- 2026-11-02: phase 0 done (tasks 1–9). New core: line-based peggy grammar, two-pass assembler
  with symbols, ORG, DB/DW (`?`, lists, strings, DUP), EQU, OFFSET, PTR and expressions; ISA table
  shared by the assembler and a ModRM decoder; pure ALU with flags; CPU with 64 KB `Uint8Array`
  memory (copy on write) running MOV, the ALU instructions, jumps, stack, CALL/RET, INT/IRET,
  STI/CLI, NOP and HLT; machine with the 5 cycle phases and a snapshot per instruction (step
  back). UI: virtualized memory with "go to", step / micro-step / back buttons, running line
  highlighted in the editor, INT 7 console, error and status boxes. Checked in headless Chromium
  with the default example (sum of a table at 1000h, code at 2000h, loop, HLT, END).
- 2026-11-02: INT 6 with keyboard input in the UI (task 25) and the I/O bus for IN/OUT (task 26).

- 2026-11-02: modernization merged (#5): Vite, React 19, Redux 5, peggy, Vitest, CI, GitHub Pages.
  Decisions 1–4 taken. This file replaces the plan kept outside the repo.
