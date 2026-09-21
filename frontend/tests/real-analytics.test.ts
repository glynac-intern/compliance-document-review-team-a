import { describe, it, expect } from "vitest";
import {
  resolveDocumentCategory,
  computeRealAnalytics,
  getHorizonLabel,
  CANONICAL_CATEGORIES,
} from "@/lib/real-analytics";
import type { BackendDocument } from "@/lib/documents-api";

function createMockDoc(overrides: Partial<BackendDocument> = {}): BackendDocument {
  return {
    id: "doc-1",
    advisor_id: "adv-1",
    status: "approved",
    original_filename: "test.pdf",
    type: "pdf",
    uploaded_at: new Date().toISOString(),
    thread_id: "thread-1",
    replaces_document_id: null,
    ...overrides,
  };
}

describe("real-analytics module", () => {
  describe("getHorizonLabel", () => {
    it("returns expected labels for all horizons", () => {
      expect(getHorizonLabel("30d")).toBe("Last 30 Days");
      expect(getHorizonLabel("90d")).toBe("Last 90 Days");
      expect(getHorizonLabel("6m")).toBe("Last 6 Months");
      expect(getHorizonLabel("12m")).toBe("Last 12 Months");
      expect(getHorizonLabel("4q")).toBe("Last 4 Quarters");
      expect(getHorizonLabel("8q")).toBe("Last 8 Quarters");
      expect(getHorizonLabel("ytd")).toContain("Year to Date");
      expect(getHorizonLabel("3y")).toBe("Last 3 Years");
    });
  });

  describe("resolveDocumentCategory", () => {
    it("resolves presentation deck", () => {
      const doc = createMockDoc({
        id: "1",
        original_filename: "Q3_Investor_Presentation.pdf",
        type: "pdf",
        status: "pending_review",
      });
      expect(resolveDocumentCategory(doc)).toBe("Presentation / Deck");
    });

    it("resolves brochure even if PDF type", () => {
      const doc = createMockDoc({
        id: "2",
        original_filename: "verity_promotional_brochure.pdf",
        type: "pdf",
        status: "approved",
      });
      expect(resolveDocumentCategory(doc)).toBe("Promotional Brochure");
    });

    it("resolves client letter from docx", () => {
      const doc = createMockDoc({
        id: "3",
        original_filename: "quarterly_update_letter.docx",
        type: "docx",
        status: "approved",
      });
      expect(resolveDocumentCategory(doc)).toBe("Client Letter");
    });

    it("resolves factsheet from xlsx", () => {
      const doc = createMockDoc({
        id: "4",
        original_filename: "performance_sheet.xlsx",
        type: "xlsx",
        status: "needs_revision",
      });
      expect(resolveDocumentCategory(doc)).toBe("Performance Factsheet");
    });

    it("falls back to Other for unrecognized types without matching keywords", () => {
      const doc = createMockDoc({
        id: "5",
        original_filename: "random_raw_file",
        type: "unknown" as BackendDocument["type"],
        status: "pending_review",
      });
      expect(resolveDocumentCategory(doc)).toBe("Other");
    });
  });

  describe("computeRealAnalytics", () => {
    it("handles empty document list gracefully", () => {
      const result = computeRealAnalytics([], "12m");
      expect(result.kpis.totalSubmissions).toBe(0);
      expect(result.kpis.approvalRatePct).toBe(0);
      expect(result.outcomeDistribution.approvedCount).toBe(0);
      expect(result.categoryBreakdown).toHaveLength(CANONICAL_CATEGORIES.length);
    });

    it("computes accurate approval, revision, and rejection rates", () => {
      const now = new Date().toISOString();
      const mockDocs = [
        createMockDoc({ id: "1", original_filename: "Doc1.pdf", type: "pdf", status: "approved", uploaded_at: now }),
        createMockDoc({ id: "2", original_filename: "Doc2.pdf", type: "pdf", status: "approved", uploaded_at: now }),
        createMockDoc({ id: "3", original_filename: "Doc3.pdf", type: "pdf", status: "needs_revision", uploaded_at: now }),
        createMockDoc({ id: "4", original_filename: "Doc4.pdf", type: "pdf", status: "rejected", uploaded_at: now }),
        createMockDoc({ id: "5", original_filename: "Doc5.pdf", type: "pdf", status: "pending_review", uploaded_at: now }),
      ];

      const result = computeRealAnalytics(mockDocs, "12m");
      expect(result.kpis.totalSubmissions).toBe(5);
      // Reviewed = 4 docs: 2 approved (50%), 1 revision (25%), 1 rejected (25%)
      expect(result.kpis.approvalRatePct).toBe(50);
      expect(result.outcomeDistribution.approvedCount).toBe(2);
      expect(result.outcomeDistribution.revisionCount).toBe(1);
      expect(result.outcomeDistribution.rejectedCount).toBe(1);
    });

    it("filters out documents older than selected time horizon", () => {
      const oldDate = new Date(Date.now() - 40 * 86400000).toISOString(); // 40 days ago
      const recentDate = new Date(Date.now() - 2 * 86400000).toISOString(); // 2 days ago

      const mockDocs = [
        createMockDoc({ id: "1", original_filename: "Old.pdf", type: "pdf", status: "approved", uploaded_at: oldDate }),
        createMockDoc({ id: "2", original_filename: "New.pdf", type: "pdf", status: "approved", uploaded_at: recentDate }),
      ];

      // 30 days horizon should exclude the 40-day-old document
      const result30d = computeRealAnalytics(mockDocs, "30d");
      expect(result30d.kpis.totalSubmissions).toBe(1);

      // 6 months horizon should include both
      const result6m = computeRealAnalytics(mockDocs, "6m");
      expect(result6m.kpis.totalSubmissions).toBe(2);
    });
  });
});
