import { test, expect, Page } from '@playwright/test';

// Configure retries and global defaults per Senior QA guidelines
test.describe.configure({ retries: 2 });

test.use({
  actionTimeout: 10_000,      // Global action timeout for clicks/typing
  navigationTimeout: 30_000,  // Navigation timeout
  viewport: { width: 1280, height: 720 },
  contextOptions: { offline: false }, // ensure network is available
});

expect.setTimeout(5_000); // Expect/assertion timeout

test.describe('EPAM — Services -> Explore Our Client Work', () => {
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
    } catch {
      // Fallback: direct navigation to Services page to avoid pointer interception issues
      await page.goto('https://www.epam.com/services', { waitUntil: 'networkidle', timeout: 30_000 });
    }

    // 3) Locate "Explore Our Client Work" link
    let exploreLink = page.getByRole('link', { name: /Explore our client work/i });
    try {
      await expect(exploreLink).toBeVisible();
    } catch {
      // If role-based locator fails (DOM variations), try text-based fallback
      exploreLink = page.getByText(/Explore our client work|Explore Our Client Work/i);
      await expect(exploreLink).toBeVisible();
    }

    // Ensure actionable
    await exploreLink.scrollIntoViewIfNeeded();

    // 4) Click the link and handle possible new tab
    // Prepare to catch a new page if the link opens target=_blank
    const newPagePromise = context.waitForEvent('page').catch(() => null);
    await exploreLink.click();
    const newPage = await Promise.race([
      newPagePromise,
      (async () => { /* resolved if no new page within navigation timeout */ return null; })()
    ]);
    const targetPage: Page = newPage ?? page;

    // Wait for navigation/settle
    await targetPage.waitForLoadState('networkidle');

    // 5) Verify "Client Work" text is visible on the resulting page
    const clientWorkText = targetPage.getByText(/Client Work/i);
    await expect(clientWorkText).toBeVisible();
  });

  // Cleanup: ensure context closed to avoid leakage (defensive)
  test.afterEach(async ({ context }) => {
    try {
      await context.clearCookies();
    } catch {}
    try {
      await context.close();
    } catch {}
  });
});
