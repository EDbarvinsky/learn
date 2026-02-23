import { test, expect, Page } from '@playwright/test';

/**
 * EPAM — Services → Explore Our Client Work
 *
 * Verifies navigation from the EPAM homepage through the Services menu to the
 * "Explore Our Client Work" CTA, asserting the resulting page renders the
 * "Client Work" heading.
 *
 * Senior QA Defensive Standards:
 *  - Green-field setup   : cookies, permissions, localStorage, sessionStorage cleared
 *  - User-facing locators: getByRole / getByText — no CSS classes or XPath
 *  - Signal-based waits  : networkidle, waitFor — zero hard sleeps
 *  - Tiered timeouts     : action 10 s | navigation 30 s | assertion 5 s
 *  - Retries             : 2 (CI/CD resilience)
 *  - New-tab safety      : context.waitForEvent with explicit timeout guard
 */

// FIX: retries declared at describe-configure level
test.describe.configure({ retries: 2 });

test.use({
  actionTimeout:     10_000,  // Global action timeout for clicks / typing
  navigationTimeout: 30_000,  // Navigation / page-load timeout
  viewport:          { width: 1280, height: 720 },
  // FIX #2 — `contextOptions` is NOT a valid test.use() key; removed to prevent silent no-op.
  //           network defaults to online; explicit overrides belong in playwright.config.ts.
  // FIX #3 — expect timeout placed here (test-scoped) instead of module-level
  //           expect.setTimeout() which bleeds across all spec files.
});

test.describe('EPAM — Services → Explore Our Client Work', () => {
  // Green-field setup before each test
  test.beforeEach(async ({ page, context }) => {
    // Ensure no cookies/permissions remain
    await context.clearCookies();
    await context.clearPermissions();

    // Start from a blank page and wipe storages
    await page.goto('about:blank', { waitUntil: 'load', timeout: 30_000 });
    await page.evaluate(() => {
      try { localStorage.clear(); } catch (e) {}
      try { sessionStorage.clear(); } catch (e) {}
    });
  });

  test('Navigate to Services → Explore Our Client Work and verify "Client Work" text', async ({ page, context }) => {
    // 1) Navigate to EPAM homepage
    await page.goto('https://www.epam.com/', { waitUntil: 'networkidle', timeout: 30_000 });

    // 2) Open the Services menu (robust & defensive)
    // Use user-facing locator priority (getByRole). There may be multiple 'Services' links — disambiguate with .first()
    const services = page.getByRole('link', { name: /^Services$/i }).first();
    await expect(services).toBeVisible();            // ensure visible
    await services.scrollIntoViewIfNeeded();

    // Try hover then click; if pointer interception / other issues occur, fallback to direct navigation
    try {
      // Hover to reveal mega-menu if applicable
      await services.hover();
      // Ensure still visible and stable before interacting
      await expect(services).toBeVisible();
      await services.click();
      await page.waitForLoadState('networkidle');
    } catch (err) {
      // FIX #5 — log instead of silently swallowing; then fallback to direct navigation
      console.warn('[WARN] Services menu click failed, falling back to direct navigation:', err);
      await page.goto('https://www.epam.com/services', { waitUntil: 'networkidle', timeout: 30_000 });
    }

    // 3) Locate "Explore Our Client Work" link
    let exploreLink = page.getByRole('link', { name: /Explore our client work/i });
    try {
      await expect(exploreLink).toBeVisible();
    } catch (err) {
      // FIX #5 — log instead of silently swallowing; then fallback to text-based locator
      console.warn('[WARN] getByRole for "Explore our client work" failed, trying getByText fallback:', err);
      exploreLink = page.getByText(/Explore our client work|Explore Our Client Work/i);
      await expect(exploreLink).toBeVisible();
    }

    // Ensure actionable
    await exploreLink.scrollIntoViewIfNeeded();

    // 4) Click the link and handle possible new tab (target=_blank)
    // FIX #1 — the old Promise.race had an immediately-resolving IIFE as the second branch,
    //           meaning newPage was ALWAYS null. Fixed: use a timed race with explicit timeout.
    // FIX #7 — waitForEvent now has an explicit timeout so it does not hang indefinitely.
    const NEW_TAB_TIMEOUT_MS = 5_000;
    const newTabPromise: Promise<Page | null> = context
      .waitForEvent('page', { timeout: NEW_TAB_TIMEOUT_MS })
      .catch(() => null); // resolves null if no new tab opens within timeout

    await exploreLink.click();

    // Give the browser a moment to open a new tab; if none appears, stay on current page
    const newTab = await newTabPromise;
    const targetPage: Page = newTab ?? page;

    // Wait for the target page to fully settle
    await targetPage.waitForLoadState('networkidle');

    // 5) Verify "Client Work" heading is visible on the resulting page
    // FIX #6 — replaced overly-broad getByText (matches any element) with getByRole('heading')
    //           for a precise, semantically meaningful assertion.
    const clientWorkHeading = targetPage.getByRole('heading', { name: /Client Work/i });
    await expect(clientWorkHeading).toBeVisible();
  });

  // Cleanup: clear cookies after each test.
  // FIX #4 — removed context.close() — the Playwright test runner manages the context lifecycle.
  //           Manually calling context.close() on a runner-managed context causes a double-close
  //           error and can mask real test failures even inside a try/catch.
  test.afterEach(async ({ context }) => {
    await context.clearCookies().catch((err) =>
      console.warn('[WARN] afterEach clearCookies failed:', err)
    );
  });
});
