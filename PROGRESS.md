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

## Phase 0: assembler bugs

- [x] **1. Normalize register names to upper case** · `gfi`
  `mov al, 1` assembles like `MOV AL, 1`.
- [x] **2. Accept CRLF line endings** · `gfi`
  Files saved on Windows parse.
- [x] **3. PUSHF/POPF are zero operand instructions** · `gfi`
  Keywords need a word boundary; a register does not match the prefix of a name (`AXIS`).
- [x] **4. Allow an empty program (just `END`)** · `gfi`
- [x] **5. Initial values of the registers and SP** · `gfi`
  Registers start at 0 and SP at a documented value (8000h, the top of user memory ⚠️).
- [x] **6. Friendly errors for unsupported instructions**
  Never a `TypeError`: unknown or not yet implemented instructions give a message with the line.
- [x] **7. Size and range checks** · Deps: 6
  `MOV AL, BX` and `MOV AL, 300` are errors with the line.
- [ ] **8. Decode MOV reg, reg (8A/8B + ModRM)**
  The cycle runs `MOV BX, AX`.
- [x] **9. Remove the debug panel from the UI** · `gfi`
  No "RESULTADO AST / COMPILED"; errors are shown with error styling.

## Phase 1: memory and two-pass assembler

- [ ] **10. 64 KB memory and virtualized view** · Deps: decision 4
  0000h–FFFFh on a `Uint8Array`, O(1) access, a snapshot per step. The memory view is virtualized
  and follows IP; the UI is fluid at maximum speed.
- [ ] **11. Two-pass assembler with a symbol table** · Deps: 6
  Pass 1 computes addresses of labels (`LOOP:`), variables and constants; pass 2 emits bytes.
  The assembler returns an address → source line map (used by 33).
- [ ] **12. ORG directive** · Deps: 10, 11
  Several ORG blocks, code and data in separate areas, error if two blocks overlap. Execution
  starts at 2000h.
- [ ] **13. DB/DW: `?`, lists and strings** · Deps: 11, 12
  `DB ?` reserves a byte; `DW` is little endian; `TABLE DB 1, 2, 4, 8`; `MSG DB "hello"`.
- [ ] **14. EQU** · Deps: 11
  Constants are replaced wherever an immediate is accepted and take no memory.
- [ ] **15. `END` as a directive and `HLT` to halt** · Deps: 11
  As in decision 3. The default example and the tests are updated.

## Phase 2: addressing modes

- [ ] **16. Opcode table decoder + ModRM** · Deps: 8
  Adding an instruction means adding table rows. A decoded instruction without an implementation
  stops the machine with a clear error.
- [ ] **17. Memory operands: direct, indirect through BX, immediate to memory** · Deps: 10, 11, 16
  `MOV AL, VAR`, `MOV [1000h], AX`, `MOV AX, [BX]`, `MOV VAR, 5`, encoded as on the 8086
  (`[BX]` is mod=00 r/m=111; direct is mod=00 r/m=110 + disp16). Memory to memory is rejected.

## Phase 3: ALU and flags

- [ ] **18. Pure ALU with flags (`src/model/alu.js`)** · `gfi`
  8 and 16 bit ADD, ADC, SUB, SBB, CMP, AND, OR, XOR, NEG, NOT, INC, DEC with Z, S, O, C, A, P.
  Exhaustive edge case tests.
- [ ] **19. NOT in the grammar** · `gfi`
- [ ] **20. ALU in the cycle and the UI** · Deps: 16, 17, 18, 19
  The instructions of 18 assemble, decode and run with every operand kind of 17; the UI shows
  flags and the real OP1/OP2/RES.

## Phase 4: control flow and stack

- [ ] **21. JMP and conditional jumps (IP relative)** · Deps: 11, 20
  `JMP`, `JZ`, `JNZ`, `JS`, `JNS`, `JC`, `JNC`, `JO`, `JNO`; error when the target is out of
  range. Tested with a counting loop.
- [ ] **22. Stack: PUSH, POP, PUSHF, POPF** · Deps: 3, 5, 10, 16
  SP decreases by 2, little endian. The UI highlights SP and the stack area.
- [ ] **23. CALL and RET** · Deps: 21, 22
  A subroutine with parameters in registers, with a test.

## Phase 5: interrupts and I/O

- [ ] **24. INT, IRET, STI, CLI and the vector table** · Deps: 22, 10
  256 vectors in the first KB; `INT n` pushes flags and IP and jumps; IRET returns. STI/CLI set I.
- [ ] **25. System interrupts 0, 3, 6 and 7, and a console in the UI** · Deps: 24
  INT 0 ends, INT 3 is a breakpoint (pause), INT 6 reads a character into `[BX]`, INT 7 writes
  AL bytes from BX to a console.
- [ ] **26. IN, OUT and an I/O bus** · Deps: 16
  Port map with an interface to plug peripherals.
- [ ] **27. PIO, LED bar and switches** · Deps: 26
- [ ] **28. PIC and the INT/NMI lines** · Deps: 24, 26
- [ ] **29. Timer** · Deps: 28
- [ ] **30. Handshake and Centronics printer** · Deps: 26, 28
- [ ] **31. CDMA** · Deps: 30, 10

## UX and infrastructure (can run in parallel)

- [ ] **32. "Step" (one instruction) and "micro-step" (one cycle phase) buttons** · `gfi`
  Buttons and shortcuts, execution without a timer, reducer tests. Includes "step back" (decision 4).
- [ ] **33. Highlight the running line in the editor** · Deps: 11
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

Assumptions made where MSX88 behavior is not confirmed. Each one is implemented in the most
reasonable way and waits for confirmation.

- (none yet)

## Log

- 2026-11-02: modernization merged (#5): Vite, React 19, Redux 5, peggy, Vitest, CI, GitHub Pages.
  Decisions 1–4 taken. This file replaces the plan kept outside the repo.
