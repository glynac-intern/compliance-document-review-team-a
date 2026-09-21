import { describe, it, expect } from "vitest";
import { filterAndSortDocuments } from "@/components/advisor/submissions-table";
import { ComplianceDocument } from "@/types/compliance";

function createMockComplianceDoc(overrides: Partial<ComplianceDocument> = {}): ComplianceDocument {
  return {
    id: "DOC-001",
    title: "Alpha Fund Factsheet",
    advisor_id: "adv-1",
    advisor_name: "Advisor 1",
    advisor_email: "advisor1@example.com",
    status: "approved",
    file_reference: "/docs/alpha.xlsx",
    type: "xlsx",
    uploaded_at: "2026-09-01T10:00:00Z",
    thread_id: "thread-1",
    replaces_document_id: null,
    version: 1,
    file_size_mb: 1.5,
    officer_name: "Officer Smith",
    ...overrides,
  };
}

describe("submissions-table filterAndSortDocuments", () => {
  const sampleDocs: ComplianceDocument[] = [
    createMockComplianceDoc({
      id: "DOC-001",
      title: "Alpha Fund Factsheet",
      type: "xlsx",
      status: "approved",
      uploaded_at: "2026-09-01T10:00:00Z",
      officer_name: "Officer Smith",
    }),
    createMockComplianceDoc({
      id: "DOC-002",
      title: "Beta Presentation",
      type: "pdf",
      status: "pending",
      uploaded_at: "2026-09-05T12:00:00Z",
      officer_name: undefined,
    }),
    createMockComplianceDoc({
      id: "DOC-003",
      title: "Gamma Commentary",
      type: "docx",
      status: "in_review",
      uploaded_at: "2026-09-10T14:00:00Z",
      officer_name: "Officer Jones",
    }),
    createMockComplianceDoc({
      id: "DOC-004",
      title: "Delta Marketing Brochure",
      type: "pdf",
      status: "needs_revision",
      uploaded_at: "2026-09-15T08:00:00Z",
      officer_name: "Officer Smith",
    }),
  ];

  it("returns all documents sorted newest-first by default", () => {
    const result = filterAndSortDocuments(sampleDocs);
    expect(result).toHaveLength(4);
    expect(result[0].id).toBe("DOC-004"); // Sep 15
    expect(result[3].id).toBe("DOC-001"); // Sep 01
  });

  it("filters documents by status correctly, treating pending and in_review as pending", () => {
    const pendingResult = filterAndSortDocuments(sampleDocs, { statusFilter: "pending" });
    // DOC-002 is 'pending', DOC-003 is 'in_review'
    expect(pendingResult.map((d) => d.id)).toEqual(["DOC-003", "DOC-002"]);

    const approvedResult = filterAndSortDocuments(sampleDocs, { statusFilter: "approved" });
    expect(approvedResult.map((d) => d.id)).toEqual(["DOC-001"]);
  });

  it("filters documents by file type", () => {
    const pdfs = filterAndSortDocuments(sampleDocs, { typeFilter: "pdf" });
    expect(pdfs.map((d) => d.id)).toEqual(["DOC-004", "DOC-002"]);

    const xlsx = filterAndSortDocuments(sampleDocs, { typeFilter: "xlsx" });
    expect(xlsx.map((d) => d.id)).toEqual(["DOC-001"]);
  });

  it("searches across title, document id, and officer name", () => {
    const byTitle = filterAndSortDocuments(sampleDocs, { searchQuery: "gamma" });
    expect(byTitle).toHaveLength(1);
    expect(byTitle[0].id).toBe("DOC-003");

    const byId = filterAndSortDocuments(sampleDocs, { searchQuery: "DOC-002" });
    expect(byId).toHaveLength(1);
    expect(byId[0].title).toBe("Beta Presentation");

    const byOfficer = filterAndSortDocuments(sampleDocs, { searchQuery: "smith" });
    expect(byOfficer.map((d) => d.id)).toEqual(["DOC-004", "DOC-001"]);
  });

  it("sorts by oldest first and title alphabetically", () => {
    const oldest = filterAndSortDocuments(sampleDocs, { sortBy: "oldest" });
    expect(oldest[0].id).toBe("DOC-001");
    expect(oldest[3].id).toBe("DOC-004");

    const byTitle = filterAndSortDocuments(sampleDocs, { sortBy: "title" });
    expect(byTitle.map((d) => d.title)).toEqual([
      "Alpha Fund Factsheet",
      "Beta Presentation",
      "Delta Marketing Brochure",
      "Gamma Commentary",
    ]);
  });
});
