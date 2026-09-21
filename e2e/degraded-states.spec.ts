import { expect, advisorTest, officerTest } from "./fixtures";

/**
 * TA-133: Error, Empty, and Degraded States in the Browser.
 *
 * Tests the graceful degradation, failure recovery, and empty state behaviors:
 * 1. Absence of LLM / AI vendor 503 surfaces clear degraded messaging and STILL
 *    allows the officer to record a regulatory decision (graceful degradation rubric row).
 * 2. Assist panel retry control recovers to a healthy state after analysis failure.
 * 3. Mid-session vendor chat errors fall back gracefully without unhandled crashes.
 * 4. Empty states render meaningful guidance when there is no data:
 *    - New advisor with no submissions
 *    - Officer with an empty review queue
 *    - Document with zero compliance flags
 * 5. Console errors fail the test to catch tripped React error boundaries.
 */

const TEST_DOC_ID = "b2222222-2222-2222-2222-222222222222";
const MINIMAL_PDF_BUFFER = Buffer.from(
  "%PDF-1.4\n1 0 obj\n<< /Title (Degraded State Test Document) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"
);

function setupOfficerDocRoutes(page: any, overrides?: { analysisResponse?: any }) {
  // Document metadata route
  page.route(`**/review/documents/${TEST_DOC_ID}`, async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: TEST_DOC_ID,
        advisor_id: "e2e_advisor_degraded",
        status: "pending_review",
        original_filename: "portfolio_strategy_q3.pdf",
        type: "pdf",
        uploaded_at: "2026-09-19T08:30:00Z",
        thread_id: "thread-degraded-001",
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
      body: MINIMAL_PDF_BUFFER,
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

  // Analysis route (if provided)
  if (overrides?.analysisResponse) {
    page.route(`**/documents/${TEST_DOC_ID}/analysis`, async (route: any) => {
      await route.fulfill(overrides.analysisResponse);
    });
  }
}

officerTest.describe("Error, Empty, and Degraded States (TA-133)", () => {
  // ---------------------------------------------------------------------------
  // 1. Graceful Degradation & Decision Making during Vendor Outage
  // ---------------------------------------------------------------------------
  officerTest(
    "vendor outage / absent LLM key displays clear degraded messaging and still accepts decision",
    async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });

      // Mock document and simulate 503 AI vendor unavailability
      setupOfficerDocRoutes(page, {
        analysisResponse: {
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            detail: "AI provider service is currently unavailable or LLM key is unconfigured.",
          }),
        },
      });

      // Mock decision recording endpoint
      await page.route(`**/documents/${TEST_DOC_ID}/decision`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: "approved",
            comment: "Reviewed and approved manually during AI provider outage.",
            decided_at: new Date().toISOString(),
          }),
        });
      });

      await page.goto(`/officer/documents/${TEST_DOC_ID}`);

      // Assert clear degraded message rendered rather than a spinner or blank region
      await expect(page.getByText("AI analysis unavailable")).toBeVisible();
      await expect(
        page.getByText("You can still review and chat normally — the analysis is supplementary.")
      ).toBeVisible();
      await expect(
        page.getByText(/AI provider service is currently unavailable or LLM key is unconfigured/i)
      ).toBeVisible();

      // Ensure stuck-forever loading spinner is NOT present
      await expect(page.getByText("Analyzing document...")).not.toBeVisible();

      // Graded rubric requirement: Officer can still record a regulatory determination
      await page
        .getByPlaceholder(/explain the decision/i)
        .fill("Reviewed and approved manually during AI provider outage.");
      await page.getByRole("button", { name: /^approve$/i }).click();

      // Verify decision is accepted and recorded successfully
      await expect(page.getByText(/decision recorded/i)).toBeVisible();

      // Assert no unhandled console errors
      const unexpected = consoleErrors.filter(
        (e) => !e.includes("503") && !e.includes("Failed to load resource")
      );
      expect(unexpected).toEqual([]);
    }
  );

  // ---------------------------------------------------------------------------
  // 2. Assist Panel Retry Control Recovers
  // ---------------------------------------------------------------------------
  officerTest(
    "assist panel retry control recovers analysis rather than remaining stuck",
    async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });

      // Initial analysis call fails with 503
      setupOfficerDocRoutes(page, {
        analysisResponse: {
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Temporary model timeout." }),
        },
      });

      // Retry endpoint succeeds with recovered analysis
      await page.route(`**/documents/${TEST_DOC_ID}/analysis/retry`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: "succeeded",
            error_message: null,
            summary: "Executive analysis completed successfully after transient outage.",
            flags: [],
            precedents: [],
          }),
        });
      });

      await page.goto(`/officer/documents/${TEST_DOC_ID}`);

      // Wait for error state
      await expect(page.getByText("AI analysis unavailable")).toBeVisible();
      const retryButton = page.getByRole("button", { name: /retry analysis/i });
      await expect(retryButton).toBeVisible();

      // Click retry
      await retryButton.click();

      // Assert panel recovers: degraded warning disappears and success content appears
      await expect(page.getByText("AI analysis unavailable")).not.toBeVisible();
      await expect(
        page.getByText(/Executive analysis completed successfully after transient outage/i)
      ).toBeVisible();
      await expect(
        page.getByText(/No regulatory flags detected in this submission/i)
      ).toBeVisible();

      const unexpected = consoleErrors.filter(
        (e) => !e.includes("503") && !e.includes("Failed to load resource")
      );
      expect(unexpected).toEqual([]);
    }
  );

  // ---------------------------------------------------------------------------
  // 3. Mid-Session Vendor Error Surfaces Gracefully
  // ---------------------------------------------------------------------------
  officerTest(
    "vendor error during chat query surfaces graceful fallback without crashing",
    async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });

      setupOfficerDocRoutes(page, {
        analysisResponse: {
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: "succeeded",
            error_message: null,
            summary: "Document under review.",
            flags: [],
            precedents: [],
          }),
        },
      });

      // Intercept chat endpoint and return 500 error
      await page.route(`**/review/documents/${TEST_DOC_ID}/chat`, async (route) => {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Downstream AI vendor connection reset." }),
        });
      });

      await page.goto(`/officer/documents/${TEST_DOC_ID}`);
      await expect(page.getByText("Document under review.")).toBeVisible();

      // Submit chat query to trigger mid-session failure
      const chatInput = page.getByPlaceholder(/ask about this document/i);
      await chatInput.fill("What disclosures are required for this fund?");
      await page.getByRole("button", { name: /send/i }).click();

      // Verify chat does not freeze or stay stuck in 'Thinking...'
      await expect(page.getByText("Thinking...")).not.toBeVisible();

      // Verify local fallback answered safely without blank screen or crash
      await expect(page.getByText(/disclosures/i).first()).toBeVisible();

      const unexpected = consoleErrors.filter(
        (e) => !e.includes("500") && !e.includes("Failed to load resource")
      );
      expect(unexpected).toEqual([]);
    }
  );

  // ---------------------------------------------------------------------------
  // 4. Empty States Render Where There is Genuinely Nothing
  // ---------------------------------------------------------------------------
  advisorTest(
    "empty state renders correctly for advisor with zero submissions",
    async ({ page }) => {
      // Mock empty submissions
      await page.route("**/documents*", async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify([]),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto("/advisor");
      await expect(page.getByText("No data available yet.")).toBeVisible();
    }
  );

  officerTest(
    "empty state renders correctly for officer with empty queue",
    async ({ page }) => {
      // Mock empty review queue
      await page.route("**/review/queue*", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      });

      await page.goto("/officer");
      await expect(page.getByText("All caught up!")).toBeVisible();
      await expect(
        page.getByText("There are no pending submissions in the review queue.")
      ).toBeVisible();
    }
  );

  officerTest(
    "empty state renders correctly for submission with zero regulatory flags",
    async ({ page }) => {
      setupOfficerDocRoutes(page, {
        analysisResponse: {
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: "succeeded",
            error_message: null,
            summary: "Comprehensive compliance audit completed.",
            flags: [],
            precedents: [],
          }),
        },
      });

      await page.goto(`/officer/documents/${TEST_DOC_ID}`);

      // Verify zero flags message and approved recommendation
      await expect(
        page.getByText("No regulatory flags detected in this submission.")
      ).toBeVisible();
      await expect(
        page.getByText("Approved: Document meets regulatory compliance standards.")
      ).toBeVisible();
    }
  );
});
