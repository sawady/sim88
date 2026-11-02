# SIM88

An educational simulator of a simplified Intel 8088 CPU that runs in the browser.

You write a small assembly program, SIM88 assembles it into memory and runs it
one fetch–decode–execute step at a time, highlighting the registers, the
instruction register, the decoder and the memory cell being used at each step.

> Screenshot: _pending_

## Who is it for

SIM88 is meant for introductory **Computer Organization** / **Computer
Architecture** courses that teach how a CPU works using a reduced 8088/8086
instruction set, in the style of classroom simulators such as MSX88:
registers and flags, the fetch–decode–execute cycle, addressing modes, the
stack, subroutines, interrupts and simple I/O peripherals.

The user interface is currently in Spanish (internationalization es/en is
planned).

## Status

SIM88 is **work in progress**. What works today:

- Editor with syntax highlighting, open/save `.asm` files (save downloads the file).
- Assembler for `MOV reg, immediate` (8 and 16 bit registers, decimal,
  hexadecimal and negative numbers) and `END`.
- Step-by-step execution with adjustable speed (fetch, decode, IP increment,
  operand fetch, execute), with the active components highlighted.

`MOV reg, reg`, arithmetic/logic instructions, flags, jumps, the stack,
interrupts, `ORG`/`DW`/`EQU` and the peripherals are planned. See
[Roadmap.md](Roadmap.md) (in Spanish) for the target scope, and the test suite
(`src/model/__tests__`) for the exact current behavior, including known bugs
(marked with `test.fails`).

## Example

```asm
; AX = 0201h
MOV AL, 1
MOV AH, 2
END
```

## Running locally

Requires Node.js 20.19+ (CI uses Node 24).

```sh
npm install
npm run dev      # development server at http://localhost:5173
npm test         # unit tests (Vitest)
npm run build    # production build in dist/
npm run preview  # serve the production build
```

Keyboard shortcuts: `F5` run, `F6` pause/resume, `F7` stop, `F8` reset,
`Ctrl+Alt+I` / `Ctrl+Alt+D` faster/slower, `Ctrl+N` new, `Ctrl+O` open,
`Ctrl+S` save, `Ctrl+Shift+S` save as.

## Project layout

```
src/grammar.pegjs     assembly grammar (compiled with peggy at build/test time)
src/model/            parser, static checker, compiler, decoder, interpreter, machine
src/model/__tests__/  model tests
src/actions, reducers Redux glue
src/components/       React UI
```

The machine state is a plain object; each step of the cycle
(`EXECUTION_CYCLE` in `src/model/machine.js`) returns an
[immutability-helper](https://github.com/kolodny/immutability-helper) spec
that is applied to it.

## Deployment

Every push to `master` is built and published to GitHub Pages by
`.github/workflows/deploy.yml` (Pages must be configured with
"Source: GitHub Actions").

## Contributing

The plan, its progress and the design decisions live in [PROGRESS.md](PROGRESS.md).
Bug reports, questions and ideas are welcome as GitHub issues; see
[CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) © Federico Sawady
