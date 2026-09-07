"use client";

import * as React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { SubmissionsTable } from "@/components/advisor/submissions-table";
import { DocumentUploadModal } from "@/components/advisor/document-upload-modal";
import { RevisionModal } from "@/components/advisor/revision-modal";
import { DocumentDetailModal } from "@/components/advisor/document-detail-modal";
import { SegmentedStatusFilter, StatusOption } from "@/components/ui/segmented-status-filter";
import { FilterPill } from "@/components/ui/filter-pill";
import { PaginationFooter } from "@/components/ui/pagination-footer";
import { Button } from "@/components/ui/button";
import { Plus, Search, X } from "lucide-react";
import { MOCK_DOCUMENTS } from "@/lib/mock-data";
import { ComplianceDocument, DocumentType } from "@/types/compliance";

const PAGE_SIZE = 10;

export default function AdvisorDashboardPage() {
  const [documents, setDocuments] = React.useState<ComplianceDocument[]>(MOCK_DOCUMENTS);
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);

  const [isUploadOpen, setIsUploadOpen] = React.useState(false);
  const [selectedDoc, setSelectedDoc] = React.useState<ComplianceDocument | null>(null);
  const [revisionDoc, setRevisionDoc] = React.useState<ComplianceDocument | null>(null);

  // Counts for filter bar
  const counts = React.useMemo(() => {
    const c = { all: documents.length, pending: 0, needs_revision: 0, approved: 0, rejected: 0 };
    documents.forEach((d) => {
      if (d.status === "pending" || d.status === "in_review") c.pending++;
      else if (d.status === "needs_revision") c.needs_revision++;
      else if (d.status === "approved") c.approved++;
      else if (d.status === "rejected") c.rejected++;
    });
    return c;
  }, [documents]);

  const statusOptions: StatusOption[] = [
    { id: "all", label: "All", count: counts.all },
    { id: "pending", label: "Pending", count: counts.pending },
    { id: "needs_revision", label: "Revision", count: counts.needs_revision },
    { id: "approved", label: "Approved", count: counts.approved },
    { id: "rejected", label: "Rejected", count: counts.rejected },
  ];

  const typeOptions = ["Presentation / Deck", "Promotional Brochure", "Client Letter", "Market Commentary", "Social Media Post", "Performance Factsheet"];

  // Filter
  const filtered = React.useMemo(() => {
    return documents.filter((d) => {
      if (statusFilter !== "all") {
        if (statusFilter === "pending" && d.status !== "pending" && d.status !== "in_review") return false;
        if (statusFilter !== "pending" && d.status !== statusFilter) return false;
      }
      if (typeFilter !== "all" && d.type !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!d.title.toLowerCase().includes(q) && !d.id.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [documents, statusFilter, typeFilter, searchQuery]);

  // Paginate
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Reset page on filter change
  React.useEffect(() => { setCurrentPage(1); }, [statusFilter, typeFilter, searchQuery]);

  // Summary line
  const summaryParts: string[] = [];
  if (counts.pending > 0) summaryParts.push(`${counts.pending} pending`);
  if (counts.needs_revision > 0) summaryParts.push(`${counts.needs_revision} revision`);
  if (counts.approved > 0) summaryParts.push(`${counts.approved} approved`);

  return (
    <AppShell>
      <div className="px-5 py-4">
        {/* Header line */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-baseline gap-3">
            <h1 className="text-lg font-semibold text-slate-900">Submissions</h1>
            <span className="text-[12px] text-slate-400">{summaryParts.join(" · ")}</span>
          </div>
          <Button size="sm" onClick={() => setIsUploadOpen(true)} className="gap-1">
            <Plus className="h-3.5 w-3.5" />
            Submit New
          </Button>
        </div>

        {/* Table container */}
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          {/* Filter bar */}
          <div className="px-3 py-2.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <SegmentedStatusFilter options={statusOptions} value={statusFilter} onChange={setStatusFilter} />
            <div className="flex items-center gap-1.5">
              <FilterPill label="Type" options={typeOptions} value={typeFilter} onChange={setTypeFilter} />
              <div className="relative">
                <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter..."
                  className="h-7 w-40 rounded-md border border-slate-200 bg-white pl-7 pr-7 text-[12px] placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <SubmissionsTable
            documents={paginated}
            onViewDetail={(d) => setSelectedDoc(d)}
            onRevise={(d) => setRevisionDoc(d)}
          />

          {/* Pagination */}
          <PaginationFooter
            currentPage={currentPage}
            pageSize={PAGE_SIZE}
            totalItems={filtered.length}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* Modals */}
      <DocumentUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={(data) => {
          const id = `DOC-2026-0${900 + documents.length}`;
          setDocuments([{
            id,
            title: data.title,
            advisor_id: "adv-101",
            advisor_name: "Jonathan Vance",
            advisor_email: "j.vance@apex.com",
            status: "pending",
            file_reference: `s3://vault/${id}.pdf`,
            type: data.type,
            uploaded_at: new Date().toISOString(),
            thread_id: `THR-0${900 + documents.length}`,
            replaces_document_id: null,
            version: 1,
            file_size_mb: data.fileSizeMb,
          }, ...documents]);
        }}
      />

      <RevisionModal
        document={revisionDoc}
        isOpen={!!revisionDoc}
        onClose={() => setRevisionDoc(null)}
        onSubmitRevision={(parent, data) => {
          const id = `DOC-2026-0${900 + documents.length}`;
          setDocuments([{
            id,
            title: data.title,
            advisor_id: parent.advisor_id,
            advisor_name: parent.advisor_name,
            advisor_email: parent.advisor_email,
            status: "pending",
            file_reference: `s3://vault/${id}.pdf`,
            type: parent.type,
            uploaded_at: new Date().toISOString(),
            thread_id: parent.thread_id,
            replaces_document_id: parent.id,
            version: parent.version + 1,
            file_size_mb: data.fileSizeMb,
          }, ...documents]);
        }}
      />

      <DocumentDetailModal
        document={selectedDoc}
        isOpen={!!selectedDoc}
        onClose={() => setSelectedDoc(null)}
        onRevise={(d) => { setSelectedDoc(null); setRevisionDoc(d); }}
      />
    </AppShell>
  );
}
