import { defineConfig, devices } from '@playwright/test';

// The checks open the built page from disk, the same way the single-file game is played offline.
// Run `npm run build` first (npm run test:e2e does). Set CHROME to use an existing Chrome or Chromium
// instead of the browser `npx playwright install chromium` downloads.
export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'tests/shots',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 1280, height: 950 },
    launchOptions: {
      executablePath: process.env.CHROME || undefined,
      args: ['--disable-background-networking'],
    },
    screenshot: 'only-on-failure',
  },
});
