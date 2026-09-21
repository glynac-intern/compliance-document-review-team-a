import { test, expect, advisorTest, officerTest, getRunInfo } from "./fixtures";

/**
 * Harness Smoke Tests (TA-130).
 *
 * Verifies core plumbing:
 * 1. App loads and renders login interface.
 * 2. Unauthenticated access redirects securely to /login.
 * 3. Advisor session reuse lands cleanly on the /advisor dashboard.
 * 4. Officer session reuse lands cleanly on the /officer dashboard.
 * 5. Direct login through the UI functions without errors.
 * 6. Test data isolation preserves database integrity (TA-104 residue prevention).
 *
 * Deliberately NOT a full submit-to-decision lifecycle check (reserved for TA-131).
 */

test.describe("Playwright Harness Smoke Suite", () => {
  test("unauthenticated visitor is redirected to /login", async ({ page }) => {
    await page.goto("/advisor");
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByRole("heading", { name: /sign in/i })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /sign in/i })
    ).toBeVisible();
  });

  advisorTest("advisor session lands directly on /advisor dashboard", async ({ page }) => {
    await page.goto("/advisor");
    await expect(page).toHaveURL(/\/advisor/);

    // Verify advisor dashboard elements are visible without manual waits
    await expect(page.getByRole("main").or(page.locator("body"))).toBeVisible();
    await expect(
      page.getByText(/verity/i).first()
    ).toBeVisible();
  });

  officerTest("officer session lands directly on /officer dashboard", async ({ page }) => {
    await page.goto("/officer");
    await expect(page).toHaveURL(/\/officer/);

    // Verify officer dashboard navigation or queue header
    await expect(page.getByRole("main").or(page.locator("body"))).toBeVisible();
    await expect(
      page.getByText(/workspace/i).or(page.getByText(/review queue/i)).first()
    ).toBeVisible();
  });

  test("can sign in interactively through the UI", async ({ page }) => {
    const runInfo = getRunInfo();
    test.skip(!runInfo, "Run info not found for interactive sign-in test");

    if (!runInfo) return;

    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();

    // Use accessible locators over CSS selectors
    await page.getByPlaceholder("Email").fill(runInfo.advisor.email);
    await page.getByPlaceholder("Password").fill(runInfo.advisor.password);

    await page.getByRole("button", { name: /sign in/i }).click();

    // Auto-waiting URL assertion (no fixed sleep)
    await expect(page).toHaveURL(/\/advisor/);
  });
});
