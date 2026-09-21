import { test, expect, advisorTest, officerTest } from "./fixtures";

/**
 * TA-132: Role Boundary and Session Handling in the Browser.
 *
 * NOTE ON SECURITY ARCHITECTURE:
 * These browser-level tests verify client-side usability guarantees (clean redirects,
 * routing users to their own dashboards, and graceful handling of session expiry).
 *
 * The true, authoritative security and role-boundary enforcement occurs independently
 * on the backend API server (verified by backend pytest suites test_role_boundary.py,
 * test_ta88_authorization_probe.py, test_ta110_jwt_tampering.py, and test_ta111_deleted_user_token.py).
 * These E2E tests ensure a frictionless UX and verify that users never encounter broken
 * screens, unhandled exceptions, or endless redirect loops when encountering role boundaries.
 */

test.describe("Role Boundary and Session Handling (TA-132)", () => {
  // ---------------------------------------------------------------------------
  // 1. Signed-out visitors navigating directly to protected routes
  // ---------------------------------------------------------------------------
  test.describe("Unauthenticated Access Protection", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("signed-out visitor navigating directly to /advisor is redirected to /login", async ({
      page,
    }) => {
      await page.goto("/advisor");
      await expect(page).toHaveURL(/\/login/);
      await expect(
        page.getByRole("heading", { name: /sign in/i })
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /sign in/i })
      ).toBeVisible();
    });

    test("signed-out visitor navigating directly to /officer is redirected to /login", async ({
      page,
    }) => {
      await page.goto("/officer");
      await expect(page).toHaveURL(/\/login/);
      await expect(
        page.getByRole("heading", { name: /sign in/i })
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /sign in/i })
      ).toBeVisible();
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Role-based Route Protection (Cross-role Navigation)
  // ---------------------------------------------------------------------------
  test.describe("Cross-role Navigation Redirection", () => {
    advisorTest(
      "authenticated advisor navigating directly to /officer is redirected to advisor dashboard",
      async ({ page }) => {
        await page.goto("/officer");
        // Must redirect to their own dashboard, not show an error page or 403 screen
        await expect(page).toHaveURL(/\/advisor/);
        await expect(page.getByRole("main")).toBeVisible();
        await expect(
          page.getByText(/good (morning|afternoon|evening)/i)
        ).toBeVisible();
      }
    );

    officerTest(
      "authenticated officer navigating directly to /advisor is redirected to officer dashboard",
      async ({ page }) => {
        await page.goto("/advisor");
        // Must redirect to their own dashboard, not show an error page
        await expect(page).toHaveURL(/\/officer/);
        await expect(page.getByRole("main")).toBeVisible();
        await expect(
          page.getByRole("heading", { name: /review queue/i })
        ).toBeVisible();
      }
    );

    advisorTest(
      "advisor opening another document by direct officer URL gets clean redirect to advisor dashboard",
      async ({ page }) => {
        // Direct attempt by an advisor to navigate to an officer document review URL
        const foreignDocId = "d6251f84-8195-4df4-95a1-2b43ddac620c";
        await page.goto(`/officer/documents/${foreignDocId}`);

        // Clean refusal via redirect to own dashboard rather than landing on a broken screen
        await expect(page).toHaveURL(/\/advisor/);
        await expect(page.getByRole("main")).toBeVisible();
        await expect(
          page.getByText(/good (morning|afternoon|evening)/i)
        ).toBeVisible();
      }
    );
  });

  // ---------------------------------------------------------------------------
  // 3. Session Expiry & Invalidation
  // ---------------------------------------------------------------------------
  test.describe("Session Expiry and Logout Lifecycle", () => {
    advisorTest(
      "session invalidation mid-session drops token and cleanly redirects to /login on next action",
      async ({ page }) => {
        await page.goto("/advisor");
        await expect(page.getByRole("main")).toBeVisible();

        // Simulate 401 Unauthorized from backend when next request is issued
        await page.route("**/documents*", async (route) => {
          await route.fulfill({
            status: 401,
            contentType: "application/json",
            body: JSON.stringify({ detail: "Signature has expired or session invalid" }),
          });
        });

        // Invalidate stored session in browser
        await page.evaluate(() => {
          localStorage.removeItem("verity_session_token");
        });

        // Trigger next user action (sync / refresh button in top bar)
        await page.getByRole("button", { name: /sync|refresh/i }).first().click();

        // Must redirect cleanly to /login without throwing an unhandled exception or blank screen
        await expect(page).toHaveURL(/\/login/);
        await expect(
          page.getByRole("heading", { name: /sign in/i })
        ).toBeVisible();
        await expect(
          page.getByRole("button", { name: /sign in/i })
        ).toBeVisible();
      }
    );

    advisorTest(
      "logout clears the session and back-button press does not restore authenticated view",
      async ({ page }) => {
        await page.goto("/advisor");
        await expect(page.getByRole("main")).toBeVisible();

        // Perform clean logout via TopBar action
        await page.getByRole("button", { name: /log out/i }).click();

        // Landed on login page
        await expect(page).toHaveURL(/\/login/);
        await expect(
          page.getByRole("heading", { name: /sign in/i })
        ).toBeVisible();

        // Assert session token is completely removed from storage
        const storedToken = await page.evaluate(() =>
          localStorage.getItem("verity_session_token")
        );
        expect(storedToken).toBeNull();

        // Press browser back button
        await page.goBack();

        // Back button must not restore a usable authenticated view; route protection bounces back to login
        await expect(page).toHaveURL(/\/login/);
        await expect(
          page.getByRole("heading", { name: /sign in/i })
        ).toBeVisible();
      }
    );
  });
});
