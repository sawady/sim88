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
   as `ADD r/m8, r8`, as on an 8086.
4. **64 KB of memory on a `Uint8Array`**, with a snapshot per step (enables "step back").
5. **Fidelity rule** (adjusts decision 2): where MSX88 / ASM88 is documented, SIM88 copies
   MSX88 even when it differs from a real 8086; real 8086 opcodes are used only where MSX88 says
   nothing. Reason: students compare with the `.LST` listings and the course material. So `JMP`
   and `CALL` carry an absolute address (`E9`/`E8`, as ASM88) and `NOP` is 98h (MSX88 manual).
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
- [ ] **27. PIO, LED bar and switches** · Deps: 26
- [ ] **28. PIC and the INT/NMI lines** · Deps: 24, 26
- [ ] **29. Timer** · Deps: 28
- [ ] **30. Handshake and Centronics printer** · Deps: 26, 28
- [ ] **31. CDMA** · Deps: 30, 10

## UX and infrastructure (can run in parallel)

- [x] **32. "Step" (one instruction) and "micro-step" (one cycle phase) buttons** · `gfi`
  Buttons and shortcuts, execution without a timer, reducer tests. Includes "step back" (decision 4).
  F7 step and F6 micro-step (as MSX88), Shift+F7 back.
- [x] **33. Highlight the running line in the editor** · Deps: 11
- [ ] **34. Keep the program in localStorage** · `gfi`
- [ ] **35. Loadable examples** · `gfi`
  A menu with example programs from `src/examples/`, one per course topic.
- [ ] **36. i18n es/en**
- [ ] **37. Screenshot and GIF for the README** · `gfi` · Deps: 9
- [ ] **38. Load Ace in a separate chunk** · `gfi`
  The main chunk is below 500 kB.
- [ ] **39. UI tests with Testing Library** · `gfi`
  A smoke test renders the App with the store and runs a program with fake timers.
- [ ] **40. Incremental TypeScript migration** · Deps: 16
  `allowJs` + `checkJs` on `src/model` first, then file by file.

## Open questions (MSX88 fidelity)

Behavior that MSX88's documentation does not settle. Each one is implemented in the most
reasonable way and waits for confirmation. Sources (MSX88 manual v3 by R. de Diego, UNLP guides
and practice sheets, ASM88 `.LST` listings) are listed in the project notes kept outside the
repo.

Resolved by Federico on 2026-11-02 (decisions 5 and 6): JMP/CALL absolute, NOP 98h, SP starts at
8000h, extensions kept with a strict mode, extra assembler errors kept.

1. **Initial registers and flags** start at 0 (SP at 8000h, IP at 2000h). Not documented.
2. **Names are case insensitive** (labels, variables, constants), as in MASM. Not documented;
   the ASM88 symbol table keeps the case as written, which does not settle it.
3. **INT 6 does not echo** the key. Not documented, but the UNLP practice programs always print
   the key with INT 7 right after INT 6, which only makes sense without echo. Enter is 0Dh.
4. **INT 3** pauses the simulation (the "Reanudar" button continues).
5. **`DB ?` / `DW ?`** reserve memory without writing it. Memory starts zeroed in SIM88; on
   MSX88 it holds whatever was there (the listings show leftover bytes).
6. **Encodings MSX88 does not document** follow the 8086: the assembler uses the general forms,
   as the listings do (no `A0`–`A3`, no accumulator immediates, no `40+r` INC), and `INT 3` is
   `CD 03` (not `CC`). The decoder understands the short forms anyway, and the short `JMP` (EB)
   stays relative.
7. **INT n through the vector table** pushes the flags and IP (no CS: there are no segments),
   clears I, and jumps to the word at 4·n. IRET pops IP and the flags. This matches the MSX88
   manual; INT 0, 3, 6 and 7 are handled by the simulator itself (the "monitor").
8. **Unmapped I/O ports** read FFh and ignore writes.

## Log

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
