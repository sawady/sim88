import { defineConfig } from '@playwright/test';

// Visual checks of the interface (npm run test:visual:docker). The reference
// images are the README's screenshots, so a change that alters them shows up
// as a failed check, and updating them keeps the README right. They are only
// comparable when taken in the same browser build and system: CI and the local
// script use the Playwright image pinned in package.json.
const PORT = 4173;

export default defineConfig({
  testDir: 'tests/visual',
  snapshotPathTemplate: 'docs/screenshots/{arg}{ext}',
  forbidOnly: !!process.env.CI,
  workers: 2,
  reporter: [['list']],
  outputDir: 'test-results',
  expect: { toHaveScreenshot: { animations: 'disabled', maxDiffPixels: 0 } },
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1024, height: 640 },
    deviceScaleFactor: 1,
  },
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
});
