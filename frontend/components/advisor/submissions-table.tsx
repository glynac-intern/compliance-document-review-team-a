"use client";

import * as React from "react";
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  ArrowUpDown,
  FileText,
  FileCheck,
  Eye,
  Edit3,
  X,
  ArrowRight,
} from "lucide-react";
import { ComplianceDocument } from "@/types/compliance";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

interface SubmissionsTableProps {
  documents: ComplianceDocument[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  sortBy: "newest" | "oldest" | "title";
  onSortByChange: (sort: "newest" | "oldest" | "title") => void;
  onSelectDocument: (doc: ComplianceDocument) => void;
  onReviseClick: (doc: ComplianceDocument) => void;
  onCertificateClick: (doc: ComplianceDocument) => void;
  onResetFilters: () => void;
  variant?: "overview" | "full";
  onViewMore?: () => void;
}

export function SubmissionsTable({
  documents,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortByChange,
  onSelectDocument,
  onReviseClick,
  onCertificateClick,
  onResetFilters,
  variant = "full",
  onViewMore,
}: SubmissionsTableProps) {
  const [showAdvancedFilters, setShowAdvancedFilters] = React.useState(false);
  const [typeFilter, setTypeFilter] = React.useState<string>("all");

  // Filter & sort logic
  const filteredDocuments = React.useMemo(() => {
    return documents
      .filter((doc) => {
        // Status filter
        if (statusFilter !== "all") {
          if (statusFilter === "pending" && doc.status !== "pending" && doc.status !== "in_review") {
            return false;
          } else if (statusFilter !== "pending" && doc.status !== statusFilter) {
            return false;
          }
        }

        // Type filter
        if (typeFilter !== "all" && doc.type !== typeFilter) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = doc.title.toLowerCase().includes(q);
          const matchId = doc.id.toLowerCase().includes(q);
          const matchType = doc.type.toLowerCase().includes(q);
          const matchOfficer = doc.officer_name?.toLowerCase().includes(q);
          if (!matchTitle && !matchId && !matchType && !matchOfficer) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "newest") {
          return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
        }
        if (sortBy === "oldest") {
          return new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime();
        }
        return a.title.localeCompare(b.title);
      });
  }, [documents, searchQuery, statusFilter, typeFilter, sortBy]);

  // Overview variant shows only the top 5 recent documents; full variant shows all filtered
  const displayedDocuments =
    variant === "overview" ? documents.slice(0, 5) : filteredDocuments;

  const hasActiveFilters =
    searchQuery.trim() !== "" || statusFilter !== "all" || typeFilter !== "all";

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden font-inter">
      {/* Overview Header Variant: Clean, uncluttered, showing 5 recent submissions + "View All" button */}
      {variant === "overview" ? (
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-normal text-slate-800 tracking-tight font-inter">
              Recent Submissions
            </h2>
            <p className="text-xs font-normal text-slate-400 mt-0.5 font-inter">
              Showing <span className="font-numbers text-slate-600">5</span> recent submissions
            </p>
          </div>

          {onViewMore && (
            <button
              type="button"
              onClick={onViewMore}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-xs font-normal text-[#1e4c77] hover:text-[#2575bc] transition-all cursor-pointer shadow-2xs font-inter group"
            >
              <span>View All</span>
              <span className="font-numbers text-slate-400">({documents.length})</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={1.8} />
            </button>
          )}
        </div>
      ) : (
        /* Dedicated Full Submissions Header Variant: With Search (Gradient halo/border), Status, Sort, Filters */
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-normal text-slate-800 tracking-tight font-inter">
              My Submissions
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-normal text-slate-400 font-inter">
                All submissions (<span className="font-numbers text-slate-600">{filteredDocuments.length}</span>)
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setTypeFilter("all");
                    onResetFilters();
                  }}
                  className="text-xs font-normal text-[#2575bc] hover:underline cursor-pointer font-inter"
                >
                  Reset filters
                </button>
              )}
            </div>
          </div>

          {/* Full Controls Bar */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Search Box with Elegant Brand Theme Gradient Border & Offset on Focus */}
            <div className="relative flex-1 sm:w-64 min-w-[190px]">
              <div className="relative rounded-xl p-[1px] bg-slate-200 transition-all duration-200 focus-within:bg-gradient-to-r focus-within:from-[#1e4c77] focus-within:to-[#2575bc] focus-within:shadow-[0_0_0_3px_rgba(37,117,188,0.15)] group">
                <div className="relative flex items-center bg-[#f4f6f8] rounded-[11px] group-focus-within:bg-white transition-colors">
                  <Search
                    className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400 group-focus-within:text-[#1e4c77] transition-colors"
                    strokeWidth={1.8}
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search submissions..."
                    className="w-full h-9 pl-9 pr-7 rounded-[11px] bg-transparent text-xs font-normal font-inter text-slate-800 placeholder:text-slate-400 focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => onSearchChange("")}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={1.8} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Status Dropdown Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => onStatusFilterChange(e.target.value)}
                className="h-9 rounded-xl bg-[#f4f6f8] border border-slate-200 text-xs font-normal font-inter text-slate-700 pl-3 pr-8 focus:outline-none focus:bg-white focus:border-[#1e4c77] focus:ring-2 focus:ring-[#1e4c77]/15 transition-all cursor-pointer appearance-none"
              >
                <option value="all">Status: All</option>
                <option value="pending">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="needs_revision">Needs Revision</option>
                <option value="rejected">Rejected</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-3 h-3 w-3 text-slate-400 pointer-events-none" strokeWidth={1.8} />
            </div>

            {/* Last Updated Sorting */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => onSortByChange(e.target.value as any)}
                className="h-9 rounded-xl bg-[#f4f6f8] border border-slate-200 text-xs font-normal font-inter text-slate-700 pl-3 pr-8 focus:outline-none focus:bg-white focus:border-[#1e4c77] focus:ring-2 focus:ring-[#1e4c77]/15 transition-all cursor-pointer appearance-none"
              >
                <option value="newest">Last Updated</option>
                <option value="oldest">Oldest First</option>
                <option value="title">Title A-Z</option>
              </select>
              <ArrowUpDown className="absolute right-2.5 top-3 h-3 w-3 text-slate-400 pointer-events-none" strokeWidth={1.8} />
            </div>

            {/* Filters Toggle Button */}
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={cn(
                "h-9 px-3 rounded-xl border text-xs font-normal font-inter flex items-center gap-1.5 transition-all cursor-pointer",
                showAdvancedFilters || typeFilter !== "all"
                  ? "bg-[#1e4c77] text-white border-[#1e4c77] shadow-xs"
                  : "bg-[#f4f6f8] border-slate-200 text-slate-700 hover:bg-slate-200/70"
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.8} />
              <span>Filters</span>
            </button>
          </div>
        </div>
      )}

      {/* Advanced Filter Drawer (Only active when in full mode and toggled) */}
      {variant === "full" && showAdvancedFilters && (
        <div className="bg-slate-50/80 px-5 sm:px-6 py-3 border-b border-slate-200 flex items-center gap-2 flex-wrap text-xs font-inter font-normal">
          <span className="text-slate-600 font-normal">Document Type:</span>
          {["all", "Presentation / Deck", "Client Letter", "Promotional Brochure", "Social Media Post"].map(
            (t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-colors cursor-pointer font-normal font-inter",
                  typeFilter === t
                    ? "bg-[#1e4c77] text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                )}
              >
                {t === "all" ? "All Types" : t}
              </button>
            )
          )}
        </div>
      )}

      {/* Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            {/* Headers: Non-bold, CamelCase Inter font */}
            <tr className="border-b border-slate-100 bg-[#f8fafc]/90 text-[12px] font-normal text-slate-400 font-inter tracking-normal">
              <th className="py-3 px-5 sm:px-6 font-normal">Document Name & ID</th>
              <th className="py-3 px-3 font-normal">Type</th>
              <th className="py-3 px-3 font-normal">Submitted</th>
              <th className="py-3 px-3 font-normal">Status</th>
              <th className="py-3 px-3 font-normal">Reviewer</th>
              <th className="py-3 px-5 sm:px-6 text-right font-normal">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {displayedDocuments.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center">
                  <div className="max-w-xs mx-auto flex flex-col items-center">
                    <div className="h-10 w-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                      <FileText className="h-5 w-5" strokeWidth={1.8} />
                    </div>
                    {documents.length === 0 ? (
                      // TA-63: a genuinely empty account (no submissions
                      // ever), distinct from "filtered to nothing" below.
                      <>
                        <p className="text-sm font-normal text-slate-800 font-inter">
                          No submissions yet
                        </p>
                        <p className="text-xs text-slate-400 mt-1 font-inter font-normal">
                          Upload your first document to get started with compliance review.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-normal text-slate-800 font-inter">
                          No matching submissions
                        </p>
                        <p className="text-xs text-slate-400 mt-1 font-inter font-normal">
                          No documents match the current filter or search criteria.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setTypeFilter("all");
                            onResetFilters();
                          }}
                          className="mt-3 text-xs font-normal text-[#1e4c77] hover:underline cursor-pointer font-inter"
                        >
                          Reset all filters
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              displayedDocuments.map((doc) => {
                const isNeedsRevision = doc.status === "needs_revision";
                const isApproved = doc.status === "approved";

                return (
                  <tr
                    key={doc.id}
                    onClick={() => onSelectDocument(doc)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    {/* Document Title & Reference */}
                    <td className="py-3.5 px-5 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-[#ebf4fb] text-[#1e4c77] flex items-center justify-center shrink-0 group-hover:bg-[#1e4c77] group-hover:text-white transition-colors">
                          <FileText className="h-4.5 w-4.5" strokeWidth={1.8} />
                        </div>
                        <div className="min-w-0 max-w-[240px] sm:max-w-xs md:max-w-sm">
                          <p className="font-normal text-slate-800 truncate group-hover:text-[#1e4c77] transition-colors text-[13px] font-inter">
                            {doc.title}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 font-inter font-normal">
                            <span className="font-normal font-numbers text-slate-400">{doc.id}</span>
                            <span>·</span>
                            <span className="font-numbers">v{doc.version}</span>
                            <span>·</span>
                            <span className="font-numbers">{doc.file_size_mb} MB</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Document Type */}
                    <td className="py-3.5 px-3 whitespace-nowrap text-slate-600 font-normal font-inter text-[12.5px]">
                      {doc.type}
                    </td>

                    {/* Submitted Date */}
                    <td className="py-3.5 px-3 whitespace-nowrap text-slate-500 font-numbers text-[12px] tabular-nums font-normal">
                      {formatDate(doc.uploaded_at)}
                    </td>

                    {/* Status Text Indicator */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <StatusBadge status={doc.status} />
                    </td>

                    {/* Reviewer */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {doc.officer_name ? (
                        <span className="text-[12px] font-normal font-inter text-slate-600">
                          {doc.officer_name}
                        </span>
                      ) : (
                        <span className="text-[12px] text-slate-400 italic font-inter font-normal">
                          Assigned to Queue
                        </span>
                      )}
                    </td>

                    {/* Action Buttons: Non-bold, CamelCase Inter */}
                    <td
                      className="py-3.5 px-5 sm:px-6 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isNeedsRevision ? (
                        <button
                          type="button"
                          onClick={() => onReviseClick(doc)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1e4c77] hover:bg-[#163e63] text-white text-[11.5px] font-normal font-inter transition-all shadow-xs cursor-pointer"
                        >
                          <Edit3 className="h-3.5 w-3.5" strokeWidth={1.8} />
                          <span>Revise</span>
                        </button>
                      ) : isApproved ? (
                        <button
                          type="button"
                          onClick={() => onCertificateClick(doc)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11.5px] font-normal font-inter transition-all cursor-pointer shadow-2xs"
                        >
                          <FileCheck className="h-3.5 w-3.5" strokeWidth={1.8} />
                          <span>Certificate</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onSelectDocument(doc)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-[11.5px] font-normal font-inter transition-all cursor-pointer shadow-2xs"
                        >
                          <Eye className="h-3.5 w-3.5 text-slate-500" strokeWidth={1.8} />
                          <span>View</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      {variant === "overview" ? (
        <div className="p-3.5 px-5 sm:px-6 border-t border-slate-100 bg-[#f8fafc]/80 flex items-center justify-between text-xs font-inter font-normal text-slate-400">
          <span>
            Showing <span className="font-numbers text-slate-600">5</span> of{" "}
            <span className="font-numbers text-slate-600">{documents.length}</span> submissions
          </span>
          {onViewMore && (
            <button
              type="button"
              onClick={onViewMore}
              className="text-xs font-normal font-inter text-[#1e4c77] hover:text-[#2575bc] hover:underline cursor-pointer inline-flex items-center gap-1"
            >
              <span>View all submissions in My Submissions</span>
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.8} />
            </button>
          )}
        </div>
      ) : (
        <div className="p-3.5 px-5 sm:px-6 border-t border-slate-100 bg-[#f8fafc]/80 flex items-center justify-between text-xs font-inter font-normal text-slate-400">
          <span>
            Showing <span className="font-numbers text-slate-600">{filteredDocuments.length}</span> of{" "}
            <span className="font-numbers text-slate-600">{documents.length}</span> submissions
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setTypeFilter("all");
                onResetFilters();
              }}
              className="text-xs font-normal font-inter text-[#1e4c77] hover:underline cursor-pointer"
            >
              Clear active filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
