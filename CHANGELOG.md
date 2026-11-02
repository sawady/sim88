# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project aims to follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html). There are no
tagged releases yet. The planned work and its status live in [PROGRESS.md](PROGRESS.md).

## [Unreleased]

### Changed (to match MSX88, with the oracle's evidence)

- The machine starts with I = 1 and with the monitor's vectors of INT 0/3/6/7 in memory.
- INT 0/3/6/7 push the flags and IP and return through the monitor's IRET, as MSX88 does; a
  program that replaces one of those vectors gets its own routine.
- INT 7 writes one line per call; CR and LF are shown as symbols.
- `HLT` always waits for an interrupt (Esc ends it), as MSX88.
- `NOP` is assembled as `90h` (ASM88), not `98h` (the manual).
- ADC/SBB with carry, INC/DEC and NOT set the flags as MSX88 does (see docs/fidelity.md);
  `PUSH SP` pushes 0.
- ModRM memory modes the SX88 does not have (`[BX+SI]`, `[BX+n]`, ...) stop the program with an
  error, as MSX88.
- Names are case sensitive in MSX88 strict mode; `DUP` without a count is one copy.
- After a reset the PIC masks every line (IMR = FFh) and the CDMA reads TC = 1; ports with
  nothing connected read 00h; PB of the PIO reads back its latch; reading 57h starts the CDMA;
  memory to memory DMA in block mode moves the whole block at once; the printer's buffer holds
  4 characters.

### Added

- Options › ALU: as MSX88 (default) or as a real 8086, for the four places where they differ
  (INC/DEC and C, ADC/SBB with carry, NOT and the flags, `PUSH SP`); Help › Differences from the
  8086 explains them. The status bar shows `ALU 8086` while it is on.
- While the CPU waits after `HLT`, the status bar and the CPU window say so ("CPU halted (HLT):
  waiting for an interrupt — Esc to stop") for as long as it lasts.

- Fidelity checked against the original MSX88 V-3.1: `tools/oracle` runs MSX88, ASM88 and
  LINK88 in an emulated PC (QEMU + FreeDOS in Docker), a corpus of 70 programs in
  `tests/fidelity` keeps what they did, and the test suite compares SIM88 with it.
  Report: [docs/fidelity.md](docs/fidelity.md).

- Text mode interface in the style of the MS-DOS tools of the time: IBM VGA 8x16 font on a
  character grid scaled by whole factors, menu bar with pull-down menus (Alt + letter, arrows,
  mouse), function key bar, windows with double line frames and shadows (Alt+1 to Alt+5), and
  dialogs. The Ace editor has a matching text mode theme.
- Themes: classic blue (Borland), MSX88, green phosphor, amber phosphor and high contrast, plus
  an optional CRT effect; chosen in Options › Appearance and remembered.
- Spanish and English interface, assembler and simulator messages included; the browser's
  language is used the first time, and Options › Language changes it.
- Options › Frequencies: the timer clock (1 Hz by default) and the printer speed (one character
  every 8 instructions by default) can be changed.
- A GIF and screenshots of every theme in the README; a favicon of its own.

- MSX88 peripherals in their four configurations, chosen in the toolbar: PIO with switches and
  LEDs, PIC (F10 requests INT0, priorities, EOI), timer at 1 Hz with a "Pulso" button, printer
  through the PIO or the handshake (HAND), and the DMA controller (CDMA). A peripherals panel
  shows their registers, and step back undoes I/O, interrupts and DMA too.
- `HLT` waits for an interrupt.
- MSX88 strict mode (toolbar toggle) that rejects SIM88 extensions: `'A'`, single-quoted
  strings, `[1000h]`, `*` and `/`.
- "Ejemplos" menu with 9 example programs, one per course topic, each tested in strict mode.
- The program and its file name are kept in localStorage between visits.
- INT 6 (read a key, buffered) and an I/O bus for `IN` / `OUT` with an immediate port or `DX`.
- Two-pass MSX88 assembler: labels, `DB` / `DW` (`?`, lists, strings, `DUP`), `EQU`, `ORG`,
  `END`, `OFFSET`, `BYTE PTR` / `WORD PTR`, `[BX]`, direct addresses and expressions, with
  friendly errors that show the line.
- 8086 decoder driven by an instruction table shared with the assembler (opcode table and
  ModRM), a pure 8/16-bit ALU with flags C, Z, S, O, A and P, and a CPU with 64 KB of memory,
  stack, `CALL` / `RET`, interrupt vector table, `INT 0` / `3` / `7`, `IRET`, `STI` / `CLI`.
- Execution phase by phase (fetch, decode, IP, operands, execute), one instruction at a time,
  and one instruction back.
- Virtualized 64 KB memory view that follows IP, with "go to address".
- MSX88 keyboard shortcuts: F6 micro-step, F7 step, F10 interrupt, Esc stop, 0–7 switches,
  `+` / `-` speed; F5 runs, pauses and resumes; Shift+F7 steps back.
- Tests with Vitest for the model, full programs for every peripheral configuration, and a UI
  smoke test with Testing Library.
- CI (tests and build) and deployment to GitHub Pages on every push to `master`.
- MIT license, README in English with a screenshot, `CONTRIBUTING.md` and `PROGRESS.md`.

### Changed

- The toolbar is replaced by the menus: the examples, the peripheral configuration and MSX88
  strict mode are in the Examples and Options menus.
- Where MSX88 differs from a real 8086, SIM88 follows MSX88: `JMP` and `CALL` carry an absolute
  address and `NOP` assembles to 98h, so the bytes match the ASM88 listings.
- Build moved from create-nw-react-app and NW.js to Vite, with React 19, react-redux 9,
  redux 5 and peggy. SIM88 is now a web app: files are opened with a file picker and saved as
  downloads.
- The model was rewritten as pure functions over the machine state; memory is copied only when
  an instruction writes it.
- The Ace editor is loaded lazily, in its own chunk.

### Removed

- The NW.js desktop build and the create-react-app service worker.
- The AST/compiled-code debug panel.
- The unused React logo (`src/images/logo.svg`) and favicon left over from the create-react-app
  template, and the Material Design icons.

### Fixed

- On a first visit the editor could start empty instead of showing the default example.
- Switches, F10, timer pulses or keys that arrived in the middle of an instruction were lost.
- Assembler: register names in lower case, CRLF line endings, `PUSHF` / `POPF`, a program that
  is just `END`, and the initial registers (all 0, SP at 8000h).
- The machine stayed running after a compile error.

## 2018–2020: first prototype

A desktop app (React, Redux and NW.js) with an Ace editor and a PEG.js grammar: registers and
their low and high halves, flags, memory, early `MOV` support, variables and constants, two's
complement numbers, an animated fetch–decode–execute cycle with adjustable speed, pause and
resume, and keyboard shortcuts.

[Unreleased]: https://github.com/sawady/sim88/commits/master
