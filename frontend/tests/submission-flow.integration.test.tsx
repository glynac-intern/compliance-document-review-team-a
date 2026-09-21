// @vitest-environment jsdom
/**
 * TA-124 (integration tests): a frontend integration test exercising a
 * multi-component flow -- submitting a document through
 * NewSubmissionModal and seeing it appear in SubmissionsTable -- against
 * a mocked API client, per the ticket's acceptance criteria. Everything
 * else in frontend/tests/ is pure-logic unit tests (node environment,
 * no DOM); this file opts into jsdom per-file via the directive above
 * rather than switching the whole suite, so the fast unit tests stay
 * fast.
 */
import * as React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { NewSubmissionModal } from "@/components/advisor/new-submission-modal";
import { SubmissionsTable } from "@/components/advisor/submissions-table";
import { adaptBackendDocument } from "@/lib/document-adapter";
import type { ComplianceDocument } from "@/types/compliance";
import type { BackendDocument } from "@/lib/documents-api";

vi.mock("@/lib/documents-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/documents-api")>("@/lib/documents-api");
  return {
    ...actual,
    documentsApi: {
      ...actual.documentsApi,
      submit: vi.fn(),
    },
  };
});

import { documentsApi } from "@/lib/documents-api";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const FAKE_UPLOADED_DOC: BackendDocument = {
  id: "doc-123",
  advisor_id: "advisor-1",
  status: "pending_review",
  original_filename: "Q3 Strategy Deck.pdf",
  type: "pdf",
  uploaded_at: "2026-09-22T00:00:00Z",
  thread_id: "thread-1",
  replaces_document_id: null,
};

/**
 * The harness a real page would provide: modal + table sharing one
 * documents list, wired through document-adapter.ts the same way
 * app/advisor/page.tsx actually does it -- not a simplified re-shape
 * invented for the test.
 */
function SubmissionFlowHarness() {
  const [documents, setDocuments] = React.useState<ComplianceDocument[]>([]);
  const [isOpen, setIsOpen] = React.useState(true);

  return (
    <>
      <NewSubmissionModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSubmit={(uploaded) => {
          setDocuments((prev) => [
            ...prev,
            adaptBackendDocument(uploaded, "Test Advisor", "advisor@test.io"),
          ]);
        }}
      />
      <SubmissionsTable
        documents={documents}
        searchQuery=""
        onSearchChange={() => {}}
        statusFilter="all"
        onStatusFilterChange={() => {}}
        sortBy="newest"
        onSortByChange={() => {}}
        onSelectDocument={() => {}}
        onReviseClick={() => {}}
        onResetFilters={() => {}}
      />
    </>
  );
}

describe("submission flow: NewSubmissionModal -> SubmissionsTable", () => {
  it("a document submitted through the modal appears in the table, via a mocked API client", async () => {
    vi.mocked(documentsApi.submit).mockResolvedValue(FAKE_UPLOADED_DOC);
    const user = userEvent.setup();

    const { container } = render(<SubmissionFlowHarness />);

    // Not in the table yet.
    expect(screen.queryByText("Q3 Strategy Deck.pdf")).toBeNull();

    const fileInput = container.querySelector<HTMLInputElement>("#file-upload");
    if (!fileInput) throw new Error("file input not found in NewSubmissionModal");

    const file = new File(["fake pdf bytes"], "Q3 Strategy Deck.pdf", { type: "application/pdf" });
    await user.upload(fileInput, file);

    const submitButton = screen.getByRole("button", { name: /submit for review/i });
    await user.click(submitButton);

    // The mocked API client was actually the thing invoked, with the
    // real file -- not a shortcut that bypasses the modal's own logic.
    await waitFor(() => expect(documentsApi.submit).toHaveBeenCalledTimes(1));
    expect(vi.mocked(documentsApi.submit).mock.calls[0][0]).toBe(file);

    // Now shows up in the table, adapted through the same
    // document-adapter.ts path the real app uses.
    await waitFor(() => expect(screen.getByText("Q3 Strategy Deck.pdf")).toBeTruthy());
  });
});
