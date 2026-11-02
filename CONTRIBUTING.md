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
```

Guidelines:

- Every behavior change comes with a test. Known bugs are written as `test.fails` (the expected
  behavior) and missing features as `test.todo`; fixing one means turning it into a normal test.
- Keep the model (`src/model`) free of React and Redux.
- When behavior must match MSX88, note your source (course guide, manual, sample program) in the
  PR description.
- Code, comments and docs in English. The UI is in Spanish for now (i18n is planned).

## License

By contributing you agree that your contributions are licensed under the [MIT License](LICENSE).
