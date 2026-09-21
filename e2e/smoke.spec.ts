import { test, expect, advisorTest, officerTest, getRunInfo } from "./fixtures";

/**
 * Harness Smoke Tests (TA-130).
 *
 * Verifies core plumbing:
 * 1. App loads and unauthenticated access redirects securely to /login.
 * 2. Direct login through the UI functions without errors.
 * 3. Advisor session reuse lands cleanly on the /advisor dashboard.
 * 4. Officer session reuse lands cleanly on the /officer dashboard.
 *
 * Deliberately NOT a full submit-to-decision lifecycle check (reserved for TA-131).
 */

test.describe("Playwright Harness Smoke Suite", () => {
  test.describe("Unauthenticated and Interactive Flows", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

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

    test("can sign in interactively through the UI", async ({ page }) => {
      const runInfo = getRunInfo();
      test.skip(!runInfo, "Run info not found for interactive sign-in test");

      if (!runInfo) return;

      await page.goto("/login");
      await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();

      // Fill credentials of the user provisioned during global setup
      await page.getByPlaceholder("Email").fill(runInfo.advisor.email);
      await page.getByPlaceholder("Password").fill(runInfo.advisor.password);

      await page.getByRole("button", { name: /sign in/i }).click();

      // Auto-waiting URL assertion
      await expect(page).toHaveURL(/\/advisor/);
    });
  });

  test.describe("Pre-authenticated Session Landing", () => {
    advisorTest("advisor session lands directly on /advisor dashboard", async ({ page }) => {
      await page.goto("/advisor");
      await expect(page).toHaveURL(/\/advisor/);

      // Verify advisor dashboard elements
      await expect(page.getByRole("main")).toBeVisible();
      await expect(page.getByText(/good (morning|afternoon|evening)/i)).toBeVisible();
    });

    officerTest("officer session lands directly on /officer dashboard", async ({ page }) => {
      await page.goto("/officer");
      await expect(page).toHaveURL(/\/officer/);

      // Verify officer dashboard elements
      await expect(page.getByRole("main")).toBeVisible();
      await expect(
        page.getByRole("heading", { name: /review queue/i })
      ).toBeVisible();
    });
  });
});
