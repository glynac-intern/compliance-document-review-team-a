import { expect, test, advisorTest, officerTest } from "./fixtures";
import {
  runAxeScan,
  setDarkMode,
  setLightMode,
  formatViolationSummary,
} from "./axe-helper";

/**
 * TA-134: Automated Accessibility Checks.
 *
 * Runs axe-core against each main screen in both light and dark mode.
 * Failing threshold: `serious` and `critical` violations fail the test.
 * `moderate` and `minor` violations are reported in CI output without failing.
 *
 * Screens tested:
 * 1. Login page (unauthenticated)
 * 2. Signup page (unauthenticated)
 * 3. Advisor dashboard (authenticated)
 * 4. Officer review queue (authenticated)
 * 5. Officer document review (authenticated, with mocked document)
 *
 * Each screen is scanned in both light and dark mode to catch contrast
 * regressions introduced by TA-115, TA-120, and TA-121 dark mode work.
 */

const TEST_DOC_ID = "a1111111-1111-1111-1111-111111111111";

function setupMockDocRoutes(page: any) {
  // Document metadata
  page.route(`**/review/documents/${TEST_DOC_ID}`, async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: TEST_DOC_ID,
        advisor_id: "e2e_advisor_a11y",
        status: "pending_review",
        original_filename: "a11y_test_portfolio.pdf",
        type: "pdf",
        uploaded_at: "2026-09-20T10:00:00Z",
        thread_id: "thread-a11y-001",
        replaces_document_id: null,
        revision_notes: null,
      }),
    });
  });

  // Document file binary
  page.route(`**/documents/${TEST_DOC_ID}/file`, async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: "application/pdf",
      body: Buffer.from(
        "%PDF-1.4\n1 0 obj\n<< /Title (A11y Test) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"
      ),
    });
  });

  // Analysis
  page.route(`**/documents/${TEST_DOC_ID}/analysis`, async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "succeeded",
        error_message: null,
        summary: "Accessibility test analysis summary.",
        flags: [
          {
            passage_excerpt: "Sample flagged passage for a11y testing.",
            matched_rule: {
              id: "RULE-001",
              text: "Sample compliance rule",
              type: "regulatory",
            },
            explanation: "This passage may require disclosure amendments.",
            severity: "medium",
          },
        ],
        precedents: [],
      }),
    });
  });

  // Thread and audit
  page.route(`**/documents/${TEST_DOC_ID}/thread`, async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  page.route(`**/documents/${TEST_DOC_ID}/audit`, async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });
}

// =============================================================================
// 1. Login Page
// =============================================================================
test.describe("Accessibility: Login Page (TA-134)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("login page passes axe scan in light mode", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();

    const result = await runAxeScan(page);
    expect(
      result.failing,
      `Login (light mode) has ${result.failing.length} serious/critical violation(s):\n${formatViolationSummary(result.failing)}`
    ).toHaveLength(0);
  });

  test("login page passes axe scan in dark mode", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();

    await setDarkMode(page);
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();

    const result = await runAxeScan(page);
    expect(
      result.failing,
      `Login (dark mode) has ${result.failing.length} serious/critical violation(s):\n${formatViolationSummary(result.failing)}`
    ).toHaveLength(0);
  });
});

// =============================================================================
// 2. Signup Page
// =============================================================================
test.describe("Accessibility: Signup Page (TA-134)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("signup page passes axe scan in light mode", async ({ page }) => {
    await page.goto("/signup");
    await expect(
      page.getByRole("heading", { name: /create.*account|sign up/i })
    ).toBeVisible();

    const result = await runAxeScan(page);
    expect(
      result.failing,
      `Signup (light mode) has ${result.failing.length} serious/critical violation(s):\n${formatViolationSummary(result.failing)}`
    ).toHaveLength(0);
  });

  test("signup page passes axe scan in dark mode", async ({ page }) => {
    await page.goto("/signup");
    await expect(
      page.getByRole("heading", { name: /create.*account|sign up/i })
    ).toBeVisible();

    await setDarkMode(page);
    await expect(
      page.getByRole("heading", { name: /create.*account|sign up/i })
    ).toBeVisible();

    const result = await runAxeScan(page);
    expect(
      result.failing,
      `Signup (dark mode) has ${result.failing.length} serious/critical violation(s):\n${formatViolationSummary(result.failing)}`
    ).toHaveLength(0);
  });
});

// =============================================================================
// 3. Advisor Dashboard
// =============================================================================
test.describe("Accessibility: Advisor Dashboard (TA-134)", () => {
  advisorTest(
    "advisor dashboard passes axe scan in light mode",
    async ({ page }) => {
      await page.goto("/advisor");
      await expect(page.getByRole("main")).toBeVisible();

      await setLightMode(page);
      await expect(page.getByRole("main")).toBeVisible();

      const result = await runAxeScan(page);
      expect(
        result.failing,
        `Advisor dashboard (light mode) has ${result.failing.length} serious/critical violation(s):\n${formatViolationSummary(result.failing)}`
      ).toHaveLength(0);
    }
  );

  advisorTest(
    "advisor dashboard passes axe scan in dark mode",
    async ({ page }) => {
      await page.goto("/advisor");
      await expect(page.getByRole("main")).toBeVisible();

      await setDarkMode(page);
      await expect(page.getByRole("main")).toBeVisible();

      const result = await runAxeScan(page);
      expect(
        result.failing,
        `Advisor dashboard (dark mode) has ${result.failing.length} serious/critical violation(s):\n${formatViolationSummary(result.failing)}`
      ).toHaveLength(0);
    }
  );
});

// =============================================================================
// 4. Officer Review Queue
// =============================================================================
test.describe("Accessibility: Officer Review Queue (TA-134)", () => {
  officerTest(
    "officer queue passes axe scan in light mode",
    async ({ page }) => {
      await page.goto("/officer");
      await expect(page.getByRole("main")).toBeVisible();

      await setLightMode(page);
      await expect(page.getByRole("main")).toBeVisible();

      const result = await runAxeScan(page);
      expect(
        result.failing,
        `Officer queue (light mode) has ${result.failing.length} serious/critical violation(s):\n${formatViolationSummary(result.failing)}`
      ).toHaveLength(0);
    }
  );

  officerTest(
    "officer queue passes axe scan in dark mode",
    async ({ page }) => {
      await page.goto("/officer");
      await expect(page.getByRole("main")).toBeVisible();

      await setDarkMode(page);
      await expect(page.getByRole("main")).toBeVisible();

      const result = await runAxeScan(page);
      expect(
        result.failing,
        `Officer queue (dark mode) has ${result.failing.length} serious/critical violation(s):\n${formatViolationSummary(result.failing)}`
      ).toHaveLength(0);
    }
  );
});

// =============================================================================
// 5. Officer Document Review
// =============================================================================
test.describe("Accessibility: Officer Document Review (TA-134)", () => {
  officerTest(
    "officer document review passes axe scan in light mode",
    async ({ page }) => {
      setupMockDocRoutes(page);
      await page.goto(`/officer/documents/${TEST_DOC_ID}`);
      await expect(
        page.getByText("Accessibility test analysis summary.")
      ).toBeVisible();

      await setLightMode(page);
      await expect(
        page.getByText("Accessibility test analysis summary.")
      ).toBeVisible();

      const result = await runAxeScan(page);
      expect(
        result.failing,
        `Officer doc review (light mode) has ${result.failing.length} serious/critical violation(s):\n${formatViolationSummary(result.failing)}`
      ).toHaveLength(0);
    }
  );

  officerTest(
    "officer document review passes axe scan in dark mode",
    async ({ page }) => {
      setupMockDocRoutes(page);
      await page.goto(`/officer/documents/${TEST_DOC_ID}`);
      await expect(
        page.getByText("Accessibility test analysis summary.")
      ).toBeVisible();

      await setDarkMode(page);
      await expect(
        page.getByText("Accessibility test analysis summary.")
      ).toBeVisible();

      const result = await runAxeScan(page);
      expect(
        result.failing,
        `Officer doc review (dark mode) has ${result.failing.length} serious/critical violation(s):\n${formatViolationSummary(result.failing)}`
      ).toHaveLength(0);
    }
  );
});

// =============================================================================
// 6. Verification: Deliberately Introduced Violation Fails the Suite
// =============================================================================
test.describe("Accessibility: Verification of Detection (TA-134)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("a deliberately injected unlabelled button is caught by axe", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();

    // Inject an unlabelled button into the DOM — this should trigger
    // the "button-name" rule at serious impact.
    await page.evaluate(() => {
      const btn = document.createElement("button");
      btn.id = "a11y-violation-test";
      btn.style.padding = "8px";
      // Deliberately NO text content, aria-label, or title
      document.body.appendChild(btn);
    });

    const result = await runAxeScan(page);

    // The scan should find at least one violation for the unlabelled button
    const buttonNameViolation = result.failing.find(
      (v) => v.id === "button-name"
    );
    expect(
      buttonNameViolation,
      "Expected axe to detect the deliberately injected unlabelled button"
    ).toBeDefined();
  });
});
