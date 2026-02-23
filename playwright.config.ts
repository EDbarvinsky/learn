import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Global Configuration
 * Centralises all timeout, retry, reporter and project settings so individual
 * spec files stay clean and only contain test logic.
 *
 * Senior QA Defensive Standards:
 *  - Global action / navigation / expect timeouts enforced here (not in specs)
 *  - 2 retries in CI; 0 in local dev for fast feedback
 *  - Chromium desktop project as default (matches 1280×720 viewport)
 *  - HTML + list reporters for CI artefact visibility
 */
export default defineConfig({
  // ── Directory & discovery ──────────────────────────────────────────────────
  testDir: './tests',
  testMatch: '**/*.spec.ts',

  // ── Parallelism ───────────────────────────────────────────────────────────
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,

  // ── Retries ───────────────────────────────────────────────────────────────
  // 2 retries on CI for flake resilience; 0 locally for fast feedback
  retries: process.env.CI ? 2 : 0,

  // ── Reporters ─────────────────────────────────────────────────────────────
  reporter: process.env.CI
    ? [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]]
    : [['list']],

  // ── Global timeouts (tiered hierarchy) ────────────────────────────────────
  timeout: 60_000, // Per-test total wall-clock timeout

  // ── Shared fixture defaults (apply to all projects) ───────────────────────
  use: {
    // Tiered timeouts
    actionTimeout:     10_000, // click / fill / hover
    navigationTimeout: 30_000, // goto / reload / waitForNavigation

    // Assertion timeout
    expect: {
      timeout: 5_000,
    },

    // Consistent viewport across all tests
    viewport: { width: 1280, height: 720 },

    // Always capture trace on first retry — invaluable for CI debugging
    trace: 'on-first-retry',

    // Screenshot only on failure
    screenshot: 'only-on-failure',

    // Video only on retry — balances artefact size vs. debuggability
    video: 'on-first-retry',

    // Network is online by default
    offline: false,

    // Base URL — allows using relative paths in page.goto('/services')
    baseURL: 'https://www.epam.com',
  },

  // ── Projects (browsers) ───────────────────────────────────────────────────
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        launchOptions: {
          args: ['--no-sandbox', '--disable-dev-shm-usage'],
        },
      },
    },
  ],

  // ── Output ────────────────────────────────────────────────────────────────
  outputDir: 'test-results',
});
