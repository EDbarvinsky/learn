// tests/epam-client-work.spec.ts
import { test, expect } from '@playwright/test';

/**
 * Test Suite: EPAM Services Navigation
 * Scenario: Homepage → Services menu → Explore Our Client Work
 * Verifies the "Client Work" H1 heading is visible on the destination page.
 */
test.describe('EPAM Services Navigation', () => {

  test.beforeEach(async ({ page }) => {
    // Use a standard desktop viewport to ensure the header nav is fully visible
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('should navigate to Client Work page via Services menu', async ({ page }) => {

    // ── STEP 1: Navigate to EPAM homepage ────────────────────────────────────
    await page.goto('https://www.epam.com/', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/EPAM/i);
    console.log('✅ Step 1 PASSED: Homepage loaded');

    // ── STEP 2: Hover over "Services" in the header menu ─────────────────────
    const servicesMenu = page
      .locator('header nav')
      .getByRole('link', { name: /^services$/i })
      .first();

    await servicesMenu.waitFor({ state: 'visible', timeout: 10_000 });
    await servicesMenu.hover();

    // Allow the mega-menu animation to complete
    await page.waitForTimeout(800);
    console.log('✅ Step 2 PASSED: "Services" mega-menu opened');

    // ── STEP 3: Click "Explore Our Client Work" link ──────────────────────────
    const clientWorkLink = page.getByRole('link', { name: /explore our client work/i });

    await clientWorkLink.waitFor({ state: 'visible', timeout: 10_000 });

    // JS click bypasses any overlapping hero-carousel z-index (common SPA pattern)
    await clientWorkLink.evaluate((el: HTMLElement) => el.click());

    await page.waitForURL(/client-work/i, { timeout: 15_000 });
    console.log('✅ Step 3 PASSED: Navigated to →', page.url());

    // ── STEP 4: Verify "Client Work" H1 heading is visible ───────────────────
    const heading = page.getByRole('heading', { name: /client work/i, level: 1 });

    await expect(heading).toBeVisible({ timeout: 10_000 });
    console.log('✅ Step 4 PASSED: "Client Work" H1 heading confirmed visible');
  });

});
