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
      /* the hosted database never resolves, so a check that misses the stand-in in tests/e2e/helpers.ts can't write
         to the real tables (routed requests are answered before the lookup). The host is also in src/ui/storage.ts. */
      args: ['--disable-background-networking', '--host-resolver-rules=MAP tuotzykmnxmmksabdlsy.supabase.co ~NOTFOUND'],
    },
    screenshot: 'only-on-failure',
  },
});
