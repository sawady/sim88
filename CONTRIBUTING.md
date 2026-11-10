# Contributing to SIM88

Thanks for your interest! SIM88 is an educational simulator, so clarity of the code and of the
error messages matters as much as features.

## Where the work is tracked

- [PROGRESS.md](PROGRESS.md) is the source of truth for planned and finished work: phases, tasks,
  dependencies and acceptance criteria. Tasks marked `gfi` are good first contributions.
- **GitHub issues are for people outside the project**: bug reports, questions about MSX88
  compatibility, ideas. If you want to take a task from PROGRESS.md, open an issue or a draft PR
  mentioning its number so we don't duplicate work.

## Development

Requires Node.js 20.19+.

```sh
npm install
npm test         # Vitest, model tests in src/model/__tests__
npm run dev      # http://localhost:5173
npm run build
npm run test:visual:docker   # screenshots of the interface (needs Docker)
```

Guidelines:

- Every behavior change comes with a test. Known bugs are written as `test.fails` (the expected
  behavior) and missing features as `test.todo`; fixing one means turning it into a normal test.
- Keep the model (`src/model`) free of React and Redux.
- When behavior must match MSX88, note your source (course guide, manual, sample program) in the
  PR description.
- Code, comments and docs in English. Every UI text goes through `src/i18n` (`es.js` and `en.js`
  must have the same keys; a test checks it). New assembler or simulator messages need a
  pattern in `src/i18n/messages.js` (a test scans `src/model` for them).
- Themes are CSS variables in `src/styles/themes.css`; a test checks that each one defines all
  of them with enough contrast.
- `docs/screenshots/` holds the reference images of the visual checks (`tests/visual`), which CI
  runs in the Playwright image. If you change how the interface looks on purpose, rewrite them
  with `npm run test:visual:docker -- --update-snapshots` and commit them.
- `npm install` downloads the screen font (CC BY-SA 4.0) into `src/fonts/vendor/`, which is not
  committed.

## License

By contributing you agree that your contributions are licensed under the [MIT License](LICENSE).
