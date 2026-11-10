#!/bin/sh
# Runs the visual checks in the same image CI uses, so the screenshots are
# comparable. Arguments go to Playwright: `--update-snapshots` rewrites the
# reference images in docs/screenshots.
set -e
cd "$(dirname "$0")/.."
version=$(node -p "require('./package.json').devDependencies['@playwright/test']")
exec docker run --rm --init --ipc=host \
  --user "$(id -u):$(id -g)" -e HOME=/tmp -e CI=1 \
  -v "$PWD":/work -w /work \
  "mcr.microsoft.com/playwright:v$version-noble" \
  sh -c 'npm run build --silent && npx playwright test "$@"' -- "$@"
