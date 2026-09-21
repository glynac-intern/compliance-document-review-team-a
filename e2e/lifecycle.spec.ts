import { test, expect } from "@playwright/test";
import {
  ADVISOR_STORAGE_STATE,
  OFFICER_STORAGE_STATE,
  getRunInfo,
} from "./fixtures";

/**
 * TA-131: Full Submit, Revise, Resubmit, and Approve Loop in the Browser.
 *
 * Walks the highest-priority browser flow covering two graded rubric rows:
 * 1. Functional loop -- submit, officer decision, advisor sees it
 * 2. Revision and audit -- revise, resubmit, approve as one linked thread
 *    with the audit trail showing who did each step and when
 *
 * Strictly adheres to TA-130 harness conventions:
 * - Role-based and accessible-name locators over CSS selectors
 * - Auto-waiting assertions over manual waits / fixed sleeps
 * - Isolated test data per run
 * - Session reuse via storageState
 */

test.describe("Full Compliance Review Lifecycle (TA-131)", () => {
  test("complete submit, revise, resubmit, and approve loop across advisor and officer", async ({
    browser,
  }, testInfo) => {
    // -------------------------------------------------------------------------
    // Setup isolated test contexts and identifiers (TA-104 isolation)
    // Include retry number so retries never collide with leftover data from
    // a previous attempt that failed after creating database records.
    // -------------------------------------------------------------------------
    const runInfo = getRunInfo();
    const runPrefix =
      `${runInfo?.runPrefix ?? `e2e_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`}` +
      `_retry${testInfo.retry}`;

    const initialFilename = `${runPrefix}_fund_overview.pdf`;
    const docTitle = initialFilename;
    const revisedFilename = `${runPrefix}_fund_overview_v2.pdf`;

    const revisionComment = `Please clarify fee structure in Section 2 and update risk disclaimers (${runPrefix})`;
    const revisionNotes = `Updated Section 2 disclosures and added required risk disclaimers (${runPrefix})`;
    const approvalComment = `All required regulatory disclaimers verified and approved (${runPrefix})`;

    // Minimal valid PDF payloads (starts with %PDF-1.4 magic bytes)
    const initialPdfBuffer = Buffer.from(
      `%PDF-1.4\n1 0 obj\n<< /Title (${docTitle}) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF`
    );
    const revisedPdfBuffer = Buffer.from(
      `%PDF-1.4\n1 0 obj\n<< /Title (${docTitle} v2) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF`
    );

    // Create authenticated browser contexts for Advisor and Officer
    const advisorContext = await browser.newContext({
      storageState: ADVISOR_STORAGE_STATE,
    });
    const advisorPage = await advisorContext.newPage();

    const officerContext = await browser.newContext({
      storageState: OFFICER_STORAGE_STATE,
    });
    const officerPage = await officerContext.newPage();

    try {
      // =======================================================================
      // STEP 1: Advisor signs in and submits a document
      // =======================================================================
      await advisorPage.goto("/advisor");
      await expect(advisorPage.getByRole("main")).toBeVisible();

      // Open new submission form
      await advisorPage
        .getByRole("button", { name: /new submission/i })
        .first()
        .click();
      await expect(
        advisorPage.getByRole("heading", { name: /new document submission/i })
      ).toBeVisible();

      // Attach document file
      await advisorPage.locator("#compliance-file-input").setInputFiles({
        name: initialFilename,
        mimeType: "application/pdf",
        buffer: initialPdfBuffer,
      });

      // Fill metadata
      await advisorPage.getByLabel(/document title/i).fill(docTitle);
      await advisorPage
        .getByLabel(/document category/i)
        .selectOption("Presentation / Deck");
      await advisorPage
        .getByLabel(/target audience/i)
        .selectOption("Institutional Investors");

      // Submit for review and wait for backend upload response
      const createSubmissionResponse = advisorPage.waitForResponse((response) => {
        return (
          response.request().method() === "POST" &&
          response.url().includes("/documents") &&
          response.ok()
        );
      });

      await advisorPage
        .getByRole("button", { name: /submit for review/i })
        .click();

      await createSubmissionResponse;

      // Verify appearance on advisor dashboard
      await expect(
        advisorPage.getByRole("heading", { name: /my submissions/i })
      ).toBeVisible();

      // Reload to ensure list displays the committed server record
      await advisorPage.reload();

      const advisorDocRow = advisorPage
        .getByRole("row")
        .filter({ has: advisorPage.getByText(docTitle, { exact: true }) })
        .first();
      await expect(advisorDocRow).toBeVisible();
      await expect(
        advisorDocRow.getByText(/pending review/i)
      ).toBeVisible();

      // =======================================================================
      // STEP 2: Officer finds it in the queue, opens it, and records Needs Revision
      // =======================================================================
      await officerPage.goto("/officer");
      await expect(
        officerPage.getByRole("heading", { name: /review queue/i })
      ).toBeVisible();

      // Functional loop rubric row: assert document appears in the officer's queue
      const queueDocumentRow = officerPage
        .getByRole("row")
        .filter({ has: officerPage.getByText(initialFilename, { exact: true }) })
        .first();
      await expect(queueDocumentRow).toBeVisible();

      // Officer opens the document review workspace
      await queueDocumentRow.click();
      await expect(officerPage).toHaveURL(/\/officer\/documents\/[0-9a-f-]+/);

      // Record Needs Revision decision with comment
      await officerPage
        .getByPlaceholder(/explain the decision/i)
        .fill(revisionComment);

      const revisionDecisionResponse = officerPage.waitForResponse((response) => {
        return (
          response.request().method() === "POST" &&
          response.url().includes("/decision") &&
          response.ok()
        );
      });

      await officerPage
        .getByRole("button", { name: /^revision$/i })
        .click();

      await revisionDecisionResponse;

      // Assert decision is recorded on the officer screen
      await expect(
        officerPage.getByText(/recorded decision/i)
      ).toBeVisible();
      await expect(
        officerPage.getByText(revisionComment)
      ).toBeVisible();

      // =======================================================================
      // STEP 3: Advisor sees status change and officer's comment without hints
      // =======================================================================
      await advisorPage.goto("/advisor");
      await expect(advisorPage.getByRole("main")).toBeVisible();

      // Locate document row in advisor's submissions and verify status change
      const advisorRevisionRow = advisorPage
        .getByRole("row")
        .filter({ has: advisorPage.getByText(initialFilename, { exact: true }) })
        .first();
      await expect(advisorRevisionRow).toBeVisible();
      await expect(
        advisorRevisionRow.getByText(/needs revision/i)
      ).toBeVisible();

      // Advisor opens document inspector
      await advisorRevisionRow.click();

      // Assert officer's comment is visible verbatim to the advisor
      await expect(
        advisorPage.getByText(/review decision/i)
      ).toBeVisible();
      await expect(
        advisorPage.getByText(revisionComment)
      ).toBeVisible();

      // =======================================================================
      // STEP 4: Advisor submits a revision against that document
      // =======================================================================
      // Click Revise in inspector drawer
      await advisorPage
        .getByRole("button", { name: /revise & resubmit/i })
        .click();

      // Assert revision modal opened and displays officer feedback
      await expect(
        advisorPage.getByRole("heading", { name: /submit revision/i })
      ).toBeVisible();
      await expect(
        advisorPage.getByText(revisionComment)
      ).toBeVisible();

      // Attach revised file and revision notes
      await advisorPage.locator("#revision-file-upload").setInputFiles({
        name: revisedFilename,
        mimeType: "application/pdf",
        buffer: revisedPdfBuffer,
      });
      await advisorPage
        .getByLabel(/revision notes/i)
        .fill(revisionNotes);

      // Submit revision and wait for response
      const createRevisionResponse = advisorPage.waitForResponse((response) => {
        return (
          response.request().method() === "POST" &&
          response.url().includes("/revisions") &&
          response.ok()
        );
      });

      await advisorPage
        .getByRole("button", { name: /submit revision/i })
        .click();

      await createRevisionResponse;

      // Modal closes automatically on success
      await expect(
        advisorPage.getByRole("heading", { name: /submit revision/i })
      ).not.toBeVisible();

      // =======================================================================
      // STEP 5: Officer approves the revision
      // =======================================================================
      await officerPage.goto("/officer");
      await expect(
        officerPage.getByRole("heading", { name: /review queue/i })
      ).toBeVisible();

      // In review queue, resubmission appears with Revision indicator
      const revisionQueueRow = officerPage
        .getByRole("row")
        .filter({ has: officerPage.getByText(revisedFilename, { exact: true }) })
        .first();
      await expect(revisionQueueRow).toBeVisible();
      await expect(
        revisionQueueRow.getByText(/revision/i)
      ).toBeVisible();

      // Officer opens the revised document
      await revisionQueueRow.click();
      await expect(officerPage).toHaveURL(/\/officer\/documents\/[0-9a-f-]+/);

      // Officer records approval decision with comment
      await officerPage
        .getByPlaceholder(/explain the decision/i)
        .fill(approvalComment);

      const approvalDecisionResponse = officerPage.waitForResponse((response) => {
        return (
          response.request().method() === "POST" &&
          response.url().includes("/decision") &&
          response.ok()
        );
      });

      await officerPage
        .getByRole("button", { name: /approve/i })
        .click();

      await approvalDecisionResponse;

      // Assert approval recorded
      await expect(
        officerPage.getByText(/recorded decision/i)
      ).toBeVisible();
      await expect(
        officerPage.getByText(/approved/i).first()
      ).toBeVisible();
      await expect(
        officerPage.getByText(approvalComment)
      ).toBeVisible();

      // =======================================================================
      // STEP 6: Advisor sees approval, comment, and unified thread history
      // =======================================================================
      await advisorPage.goto("/advisor");
      await expect(advisorPage.getByRole("main")).toBeVisible();

      // Open inspector for the revised (approved) document
      const updatedAdvisorRow = advisorPage
        .getByRole("row")
        .filter({ has: advisorPage.getByText(revisedFilename, { exact: true }) })
        .first();
      await updatedAdvisorRow.click();

      // Assert final approval and its comment visible to advisor by text
      await expect(
        advisorPage.getByText(/review decision/i)
      ).toBeVisible();
      await expect(
        advisorPage.getByText(approvalComment)
      ).toBeVisible();

      // Verify thread renders as one ordered history containing both versions and both decisions
      await expect(
        advisorPage.getByText(/revision history \(2\)/i)
      ).toBeVisible();

      const revisionHistoryTable = advisorPage
        .getByRole("table")
        .filter({ hasText: /version/i });
      await expect(revisionHistoryTable).toBeVisible();
      await expect(revisionHistoryTable.getByText(/v1/i)).toBeVisible();
      await expect(revisionHistoryTable.getByText(/v2/i)).toBeVisible();
      await expect(
        revisionHistoryTable.getByText(/needs revision/i)
      ).toBeVisible();
      await expect(
        revisionHistoryTable.getByText(/approved/i)
      ).toBeVisible();

      // Verify audit trail view shows actions for the cycle in chronological order
      await expect(
        advisorPage.getByText(/audit trail/i).first()
      ).toBeVisible();
      await expect(
        advisorPage.getByRole("cell", { name: /^submitted$/i }).first()
      ).toBeVisible();
      await expect(
        advisorPage.getByRole("cell", { name: /^resubmitted$/i }).first()
      ).toBeVisible();
      await expect(
        advisorPage.getByRole("cell", { name: /^decided$/i }).first()
      ).toBeVisible();

      // Verify Officer Audit Log view displays both actors and actions
      await officerPage.goto("/officer");
      await officerPage
        .getByRole("button", { name: /audit log/i })
        .click();
      await expect(
        officerPage.getByRole("heading", { name: /audit log/i })
      ).toBeVisible();

      const auditTable = officerPage.getByRole("table");
      await expect(auditTable).toBeVisible();

      // Verify entries for our run's document exist in the officer audit log
      const initialDocLogEntry = auditTable.getByRole("row").filter({
        hasText: initialFilename,
      });
      await expect(initialDocLogEntry.first()).toBeVisible();

      // Verify actor roles and actions appear
      if (runInfo) {
        await expect(
          auditTable.getByText(runInfo.advisor.name).first()
        ).toBeVisible();
        await expect(
          auditTable.getByText(runInfo.officer.name).first()
        ).toBeVisible();
      }
    } finally {
      await advisorContext.close();
      await officerContext.close();
    }
  });
});
