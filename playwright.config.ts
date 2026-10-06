import { defineConfig } from '@playwright/test';

// E2E tests run against a production build wired to the Firebase emulators
// (`vite build --mode emulator` → dist-e2e/), served from a GitHub-Pages-like
// sub-path. `npm run test:e2e` builds, starts the emulators and runs the suite.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  retries: 0,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: 'http://localhost:4173/workout-tracker/',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'uk-UA',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node scripts/serve-dist.mjs',
    env: { DIST: 'dist-e2e' },
    url: 'http://localhost:4173/workout-tracker/',
    reuseExistingServer: !process.env.CI,
  },
});
