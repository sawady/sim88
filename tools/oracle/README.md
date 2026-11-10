# MSX88 oracle

Runs the programs of the fidelity corpus (`tests/fidelity/programs/`) on the
original MSX88 V-3.1, ASM88 and LINK88, and writes what they did to
`tests/fidelity/golden/`. SIM88's test suite compares itself with those golden
files (`src/model/__tests__/fidelity.test.js`), so CI does not need any of
this. The results are summarized in [docs/fidelity.md](../../docs/fidelity.md).

## Running it

Needs Docker (no root, nothing installed on the host) and network access the
first time.

```sh
tools/oracle/run.sh                     # the whole corpus (about 15 minutes)
tools/oracle/run.sh mov-modes stack     # only some programs (golden files are rewritten)
tools/oracle/run.sh --interactive       # leave the emulator running to explore by hand
tools/oracle/run.sh --reparse           # only rebuild the parsed listings from the kept .lst files
```

Then `UPDATE_FIDELITY=1 npx vitest run fidelity` refreshes the summary in
`docs/fidelity.md`, and `FIDELITY_REPORT=1 npx vitest run fidelity` prints every
difference between SIM88 and the golden files.

The first run downloads, to `~/.cache/sim88-oracle` (`SIM88_ORACLE_CACHE`):

- `MSX88Portable.zip` from https://vonsim.github.io/msx88/ — the package the
  UNLP courses hand out (DOSBox portable + MSX88 V-3.1 + ASM88 + LINK88 + the
  manual). SHA-256 `94b2ba99…d76406`.
- FreeDOS 1.3 Lite (`FD13-LiteUSB.zip`) from ibiblio. SHA-256 `64a93458…f9f7e`.

Both hashes, and the hashes of the three executables, are checked
(`oracle.py`). Nothing from those packages is stored in the repo: MSX88 is
free for public education and non profit individual use, but it is not ours
to redistribute.

## How it works

MSX88 is a DOS program that draws the CPU on a 640x480 VGA screen and reads
the keyboard. The oracle runs it in **QEMU** with FreeDOS, inside a Docker
container (`Dockerfile`), with no display. QEMU's monitor gives three things
DOSBox does not: sending keys (`sendkey`), screenshots (`screendump`) and
reading the PC's memory (`pmemsave`).

1. A FreeDOS disk image gets ASM88, LINK88 and MSX88 in `C:\M` (built once,
   cached as `base.img`). For each run the corpus is copied in with DOS names
   (`P000.ASM`, ...) and a batch file assembles and links everything:
   `ASM88 <P000.IN1` and `LINK88 <P000.IN2` (they ask for file names; command
   line arguments do not work under FreeDOS, stdin does).
2. A first MSX88 session saves the initial memory (`S INICIAL.MEM`) and
   learns the font: three programs print every printable character with
   INT 7, and the oracle keeps each 8x8 glyph of the command window.
3. Each program runs in a fresh MSX88 session: `L INICIAL.MEM` (so every
   program starts from the same memory: MSX88 does not clear its memory, it
   starts with whatever the PC RAM had), `C n` for its configuration, `L Pnnn`,
   `+` (fast mode), `B` (clear the command window) and `G`. Keys go one at a
   time, waiting for the echo: MSX88 drops keys typed while it is busy.
4. The run ends when the bottom help bar is back to the monitor's and the
   screen stops changing, or after the program's timeout (then ESC stops it:
   status `timeout`). The state is read from MSX88's own memory: the register
   widgets keep the value next to its text (`AX\0`, `"12 34"`), the flags
   widget keeps the FLAGS word (8086 layout), and the simulated 64 KB are
   found by the signature of the initial vector table. The command window is
   read from a screendump with the learned glyphs.

### Program options

Comment lines starting with `;;` at the top of a program:

| Option | Meaning |
|---|---|
| `;; run: no` | only assemble (assembler error tests) |
| `;; config: 2` | MSX88 configuration (`C 2`) |
| `;; monitor: M 5A \| ...` | monitor commands before `G` |
| `;; keys: 1.5:shift-a 2:f10` | while it runs: wait (seconds), press (QEMU key names) |
| `;; timeout: 8` | seconds before stopping it with ESC (default 15) |
| `;; sim88: f10@2000 pulse/500` | the same events for SIM88, in instructions (see `tests/fidelity/compare.js`) |
| `;; paper: yes` | read the printer's paper after the run (F9, F5) into `run.paper`; only `A`-`Z`, `0`-`9` and spaces can be read |
| `;; ignore: IP` | registers not compared (where a never ending loop was stopped) |
| `;; compare: no` | an experiment: it runs on MSX88 but is not compared (`exp-*`, timing) |

### Golden files

`tests/fidelity/golden/<program>.json`:

- `assembler`: errors and warnings, the listing parsed from the `.LST`
  (address, bytes, source line) and the symbol table. The `.LST` itself is
  kept next to it.
- `run`: `status` (`stopped`: back to the monitor; `timeout`: still running;
  `error`: MSX88 reported an execution error), the registers, the FLAGS word,
  the memory that changed (runs of hex bytes, relative to
  `_initial-memory.json`) and the 5 lines of the command window.

`run.paper`, when the program asks for it, has the lines of the paper. The
paper has its own font, so a calibration program prints the characters the
programs use (it adds about two minutes to a run with any such program).

`_font.json` lists characters that share a glyph in MSX88's font (`O` and
`0`): the screen text cannot tell them apart.

## Exploring by hand

`run.sh --interactive` assembles the corpus and leaves QEMU running with its
monitor at `~/.cache/sim88-oracle/run/mon.sock`. Then:

```sh
python3 tools/oracle/attach.py 'T:msx88\n' S:5 K:esc S:1 'T:L P003\n' SHOT:/cache/run/s.ppm
```

types, presses keys, waits and takes screenshots (the path is the
container's: `/cache` is the cache directory). Stop it with
`docker rm -f $(docker ps -q --filter name=sim88-oracle)`.

## Limits

- Timing: the timer and the printer depend on time; the oracle presses keys
  by wall clock while SIM88 gets events by instruction count.
- The command window shows 5 lines: programs keep their INT 7 output short.
- MSX88's stack frames leak into 8000h-FFFFh of the simulated memory while it
  runs; the comparison only looks at the user memory (0000h-7FFFh).
