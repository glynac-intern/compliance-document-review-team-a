"use client";

import * as React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ReviewQueueTable } from "@/components/officer/review-queue-table";
import { SegmentedStatusFilter, StatusOption } from "@/components/ui/segmented-status-filter";
import { FilterPill } from "@/components/ui/filter-pill";
import { PaginationFooter } from "@/components/ui/pagination-footer";
import { Search, X } from "lucide-react";
import { MOCK_DOCUMENTS } from "@/lib/mock-data";
import { ComplianceDocument } from "@/types/compliance";

const PAGE_SIZE = 10;

export default function OfficerQueuePage() {
  const [documents] = React.useState<ComplianceDocument[]>(MOCK_DOCUMENTS);
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [advisorFilter, setAdvisorFilter] = React.useState("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);

  // Queue-relevant documents (only pending/in_review for queue, but show all with filters)
  const counts = React.useMemo(() => {
    const pending = documents.filter((d) => d.status === "pending" || d.status === "in_review");
    const highRisk = pending.filter((d) => (d.flags_count?.high ?? 0) > 0);
    const resub = pending.filter((d) => d.replaces_document_id !== null);
    const standard = pending.filter((d) => (d.flags_count?.high ?? 0) === 0 && d.replaces_document_id === null);
    return { all: pending.length, high: highRisk.length, resub: resub.length, standard: standard.length };
  }, [documents]);

  const statusOptions: StatusOption[] = [
    { id: "all", label: "All Pending", count: counts.all },
    { id: "high_risk", label: "High Risk", count: counts.high },
    { id: "resubmissions", label: "Resubmissions", count: counts.resub },
    { id: "standard", label: "Standard", count: counts.standard },
  ];

  const advisorOptions = [...new Set(documents.map((d) => d.advisor_name))];

  const filtered = React.useMemo(() => {
    return documents.filter((d) => {
      // Base: only show pending/in_review
      if (d.status !== "pending" && d.status !== "in_review") return false;

      if (statusFilter === "high_risk" && (d.flags_count?.high ?? 0) === 0) return false;
      if (statusFilter === "resubmissions" && d.replaces_document_id === null) return false;
      if (statusFilter === "standard" && ((d.flags_count?.high ?? 0) > 0 || d.replaces_document_id !== null)) return false;

      if (advisorFilter !== "all" && d.advisor_name !== advisorFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!d.title.toLowerCase().includes(q) && !d.id.toLowerCase().includes(q) && !d.advisor_name.toLowerCase().includes(q)) return false;
      }

      return true;
    });
  }, [documents, statusFilter, advisorFilter, searchQuery]);

  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  React.useEffect(() => { setCurrentPage(1); }, [statusFilter, advisorFilter, searchQuery]);

  const summaryParts: string[] = [];
  summaryParts.push(`${counts.all} awaiting`);
  if (counts.high > 0) summaryParts.push(`${counts.high} flagged`);

  return (
    <AppShell>
      <div className="px-5 py-4">
        {/* Header */}
        <div className="flex items-baseline gap-3 mb-4">
          <h1 className="text-lg font-semibold text-slate-900">Review Queue</h1>
          <span className="text-[12px] text-slate-400">{summaryParts.join(" · ")}</span>
        </div>

        {/* Table container */}
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          {/* Filters */}
          <div className="px-3 py-2.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <SegmentedStatusFilter options={statusOptions} value={statusFilter} onChange={setStatusFilter} />
            <div className="flex items-center gap-1.5">
              <FilterPill label="Advisor" options={advisorOptions} value={advisorFilter} onChange={setAdvisorFilter} />
              <div className="relative">
                <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
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

          {/* Queue table */}
          <ReviewQueueTable documents={paginated} />

          {/* Pagination */}
          <PaginationFooter
            currentPage={currentPage}
            pageSize={PAGE_SIZE}
            totalItems={filtered.length}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>
    </AppShell>
  );
}
