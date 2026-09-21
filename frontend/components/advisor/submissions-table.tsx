"use client";

import * as React from "react";
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  ArrowUpDown,
  FileText,
  Eye,
  Edit3,
  X,
  ArrowRight,
} from "lucide-react";
import { ComplianceDocument } from "@/types/compliance";
import { StatusBadge } from "@/components/ui/status-badge";
import { FileTypeIcon } from "@/components/ui/file-type-icon";
import { cn } from "@/lib/utils";

import { ErrorState } from "@/components/common/error-state";
import { loadSettings } from "@/lib/user-settings";

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
  onResetFilters: () => void;
  variant?: "overview" | "full";
  onViewMore?: () => void;
  isLoading?: boolean;
  loadError?: string | null;
  onRetry?: () => void;
}

export interface FilterAndSortOptions {
  searchQuery?: string;
  statusFilter?: string;
  typeFilter?: string;
  sortBy?: "newest" | "oldest" | "title";
}

export function filterAndSortDocuments(
  documents: ComplianceDocument[],
  options: FilterAndSortOptions = {}
): ComplianceDocument[] {
  const {
    searchQuery = "",
    statusFilter = "all",
    typeFilter = "all",
    sortBy = "newest",
  } = options;

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
  onResetFilters,
  variant = "full",
  onViewMore,
  isLoading = false,
  loadError = null,
  onRetry,
}: SubmissionsTableProps) {
  const [showAdvancedFilters, setShowAdvancedFilters] = React.useState(false);
  const [typeFilter, setTypeFilter] = React.useState<string>("all");

  // TA-118: Settings > Display > "Compact rows" -- read after mount (not
  // as the useState initializer) to avoid a hydration mismatch.
  const [compact, setCompact] = React.useState(false);
  React.useEffect(() => {
    if (loadSettings().compactRows) setCompact(true);
  }, []);

  // Filter & sort logic
  const filteredDocuments = React.useMemo(() => {
    return filterAndSortDocuments(documents, {
      searchQuery,
      statusFilter,
      typeFilter,
      sortBy,
    });
  }, [documents, searchQuery, statusFilter, typeFilter, sortBy]);

  // Overview variant shows only the top 5 recent documents; full variant shows all filtered
  const displayedDocuments =
    variant === "overview" ? documents.slice(0, 5) : filteredDocuments;

  const hasActiveFilters =
    searchQuery.trim() !== "" || statusFilter !== "all" || typeFilter !== "all";

  // A needs_revision document already superseded by its own revision
  // keeps that status forever as a historical record -- it's not still
  // actionable, so it shouldn't offer a "Revise" button.
  const supersededIds = React.useMemo(
    () => new Set(documents.filter((d) => d.replaces_document_id).map((d) => d.replaces_document_id as string)),
    [documents]
  );

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
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden font-inter">
      {/* Overview Header Variant: Clean, uncluttered, showing 5 recent submissions + "View All" button */}
      {variant === "overview" ? (
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-normal text-slate-800 dark:text-slate-100 tracking-tight font-inter">
              Recent Submissions
            </h2>
          </div>

          {onViewMore && (
            <button
              type="button"
              onClick={onViewMore}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-xs font-normal text-[#1e4c77] dark:text-[#7fb2e3] hover:text-[#2575bc] dark:hover:text-[#a6cdf0] transition-all cursor-pointer shadow-2xs font-inter group"
            >
              <span>View All</span>
              <span className="font-numbers text-slate-400 dark:text-slate-500">({documents.length})</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={1.8} />
            </button>
          )}
        </div>
      ) : (
        /* Dedicated Full Submissions Header Variant: Search, Status, Sort, Filters — no redundant title */
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-normal text-slate-400 dark:text-slate-500 font-inter">
              <span className="font-numbers text-slate-600 dark:text-slate-300">{filteredDocuments.length}</span> submission{filteredDocuments.length !== 1 ? "s" : ""}
              {hasActiveFilters && (
                <> · <button
                  type="button"
                  onClick={() => {
                    setTypeFilter("all");
                    onResetFilters();
                  }}
                  className="text-xs font-normal text-[#2575bc] dark:text-[#7fb2e3] hover:underline cursor-pointer font-inter"
                >
                  Reset filters
                </button></>
              )}
            </span>
          </div>

          {/* Full Controls Bar */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Search Box with Elegant Brand Theme Gradient Border & Offset on Focus */}
            <div className="relative flex-1 sm:w-64 min-w-[190px]">
              <div className="relative rounded-xl p-[1px] bg-slate-200 dark:bg-slate-700 transition-all duration-200 focus-within:bg-gradient-to-r focus-within:from-[#1e4c77] focus-within:to-[#2575bc] focus-within:shadow-[0_0_0_3px_rgba(37,117,188,0.15)] group">
                <div className="relative flex items-center bg-[#f4f6f8] dark:bg-slate-800 rounded-[11px] group-focus-within:bg-white dark:group-focus-within:bg-slate-800 transition-colors">
                  <Search
                    className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400 dark:text-slate-500 group-focus-within:text-[#1e4c77] dark:group-focus-within:text-[#7fb2e3] transition-colors"
                    strokeWidth={1.8}
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search submissions..."
                    className="w-full h-9 pl-9 pr-7 rounded-[11px] bg-transparent text-xs font-normal font-inter text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => onSearchChange("")}
                      className="absolute right-2.5 top-2.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
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
                className="h-9 rounded-xl bg-[#f4f6f8] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-normal font-inter text-slate-700 dark:text-slate-300 pl-3 pr-8 focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-[#1e4c77] dark:focus:border-[#7fb2e3] focus:ring-2 focus:ring-[#1e4c77]/15 dark:focus:ring-[#7fb2e3]/20 transition-all cursor-pointer appearance-none"
              >
                <option value="all">Status: All</option>
                <option value="pending">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="needs_revision">Needs Revision</option>
                <option value="rejected">Rejected</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-3 h-3 w-3 text-slate-400 dark:text-slate-500 pointer-events-none" strokeWidth={1.8} />
            </div>

            {/* Last Updated Sorting */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => onSortByChange(e.target.value as "newest" | "oldest" | "title")}
                className="h-9 rounded-xl bg-[#f4f6f8] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-normal font-inter text-slate-700 dark:text-slate-300 pl-3 pr-8 focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-[#1e4c77] dark:focus:border-[#7fb2e3] focus:ring-2 focus:ring-[#1e4c77]/15 dark:focus:ring-[#7fb2e3]/20 transition-all cursor-pointer appearance-none"
              >
                <option value="newest">Last Updated</option>
                <option value="oldest">Oldest First</option>
                <option value="title">Title A-Z</option>
              </select>
              <ArrowUpDown className="absolute right-2.5 top-3 h-3 w-3 text-slate-400 dark:text-slate-500 pointer-events-none" strokeWidth={1.8} />
            </div>

            {/* Filters Toggle Button */}
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={cn(
                "h-9 px-3 rounded-xl border text-xs font-normal font-inter flex items-center gap-1.5 transition-all cursor-pointer",
                showAdvancedFilters || typeFilter !== "all"
                  ? "bg-[#1e4c77] text-white border-[#1e4c77] shadow-xs"
                  : "bg-[#f4f6f8] dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700/70"
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
        <div className="bg-slate-50/80 dark:bg-slate-800/40 px-5 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 flex-wrap text-xs font-inter font-normal">
          <span className="text-slate-600 dark:text-slate-400 font-normal">Document Type:</span>
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
                    : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
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
            <tr className="border-b border-slate-100 dark:border-slate-800 bg-[#f8fafc]/90 dark:bg-slate-800/60 text-[12px] font-normal text-slate-400 dark:text-slate-500 font-inter tracking-normal">
              <th className="py-3 px-5 sm:px-6 font-normal">
                {variant === "overview" ? "Document Name" : "Document Name & ID"}
              </th>
              <th className="py-3 px-3 font-normal">Type</th>
              <th className="py-3 px-3 font-normal">Submitted</th>
              <th className="py-3 px-3 font-normal">Status</th>
              <th className={cn("py-3 px-3 font-normal", variant === "overview" && "pr-5 sm:pr-6")}>
                Reviewer
              </th>
              {variant === "full" && (
                <th className="py-3 px-5 sm:px-6 text-right font-normal">Action</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {loadError ? (
              <tr>
                <td colSpan={variant === "full" ? 6 : 5} className="py-12 px-4 text-center">
                  <div className="max-w-md mx-auto">
                    <ErrorState message={loadError} onRetry={onRetry} />
                  </div>
                </td>
              </tr>
            ) : isLoading ? (
              <tr>
                <td colSpan={variant === "full" ? 6 : 5} className="py-12 text-center text-slate-400 dark:text-slate-500 font-inter">
                  <div className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-slate-300 dark:border-slate-600 border-t-[#1e4c77] dark:border-t-[#7fb2e3] animate-spin" />
                    <span>Loading submissions...</span>
                  </div>
                </td>
              </tr>
            ) : displayedDocuments.length === 0 ? (
              <tr>
                <td colSpan={variant === "full" ? 6 : 5} className="py-12 text-center">
                  <div className="max-w-xs mx-auto flex flex-col items-center">
                    <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mb-3">
                      <FileText className="h-5 w-5" strokeWidth={1.8} />
                    </div>
                    {documents.length === 0 ? (
                      <p className="text-sm font-normal text-slate-800 dark:text-slate-100 font-inter">
                        No data available yet.
                      </p>
                    ) : (
                      <>
                        <p className="text-sm font-normal text-slate-800 dark:text-slate-100 font-inter">
                          No matching submissions
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-inter font-normal">
                          No documents match the current filter or search criteria.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setTypeFilter("all");
                            onResetFilters();
                          }}
                          className="mt-3 text-xs font-normal text-[#1e4c77] dark:text-[#7fb2e3] hover:underline cursor-pointer font-inter"
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
                const isNeedsRevision = doc.status === "needs_revision" && !supersededIds.has(doc.id);
                const isApproved = doc.status === "approved";

                return (
                  <tr
                    key={doc.id}
                    onClick={() => onSelectDocument(doc)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                  >
                    {/* Document Title & Distinguishable Format Icon */}
                    <td className={cn("px-5 sm:px-6", compact ? "py-1.5" : "py-3.5")}>
                      <div className="flex items-center gap-3">
                        <FileTypeIcon filename={doc.title} type={doc.type} size="md" />
                        <div className="min-w-0 max-w-[260px] sm:max-w-xs md:max-w-md">
                          <p className="font-normal text-slate-800 dark:text-slate-200 truncate group-hover:text-[#1e4c77] dark:group-hover:text-[#7fb2e3] transition-colors text-[13px] font-inter">
                            {doc.title}
                          </p>
                          {variant === "full" && (
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 font-inter font-normal">
                              <span className="font-normal font-numbers text-slate-400 dark:text-slate-500">{doc.id}</span>
                              <span>·</span>
                              <span className="font-numbers">v{doc.version}</span>
                              <span>·</span>
                              <span className="font-numbers">{doc.file_size_mb} MB</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Document Type */}
                    <td className={cn("px-3 whitespace-nowrap text-slate-600 dark:text-slate-400 font-normal font-inter text-[12.5px]", compact ? "py-1.5" : "py-3.5")}>
                      {doc.type}
                    </td>

                    {/* Submitted Date */}
                    <td className={cn("px-3 whitespace-nowrap text-slate-500 dark:text-slate-400 font-numbers text-[12px] tabular-nums font-normal", compact ? "py-1.5" : "py-3.5")}>
                      {formatDate(doc.uploaded_at)}
                    </td>

                    {/* Status Text Indicator */}
                    <td className={cn("px-3 whitespace-nowrap", compact ? "py-1.5" : "py-3.5")}>
                      <StatusBadge status={doc.status} />
                    </td>

                    {/* Reviewer */}
                    <td className={cn("px-3 whitespace-nowrap", compact ? "py-1.5" : "py-3.5", variant === "overview" && "pr-5 sm:pr-6")}>
                      {doc.officer_name ? (
                        <span className="text-[12px] font-normal font-inter text-slate-600 dark:text-slate-400">
                          {doc.officer_name}
                        </span>
                      ) : (
                        <span className="text-[12px] text-slate-400 dark:text-slate-500 italic font-inter font-normal">
                          Assigned to Queue
                        </span>
                      )}
                    </td>

                    {/* Action Buttons: Only in dedicated My Submissions dashboard view */}
                    {variant === "full" && (
                      <td
                        className={cn("px-5 sm:px-6 text-right whitespace-nowrap", compact ? "py-1.5" : "py-3.5")}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isNeedsRevision ? (
                          <button
                            type="button"
                            onClick={() => onReviseClick(doc)}
                            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-[#ebf4fb]/50 dark:hover:bg-[#7fb2e3]/10 hover:border-[#1e4c77]/30 dark:hover:border-[#7fb2e3]/30 text-slate-700 dark:text-slate-300 hover:text-[#1e4c77] dark:hover:text-[#7fb2e3] text-xs font-normal font-inter transition-all shadow-2xs cursor-pointer group select-none"
                          >
                            <Edit3 className="h-3.5 w-3.5 stroke-[1.8] text-[#1e4c77] dark:text-[#7fb2e3]" />
                            <span>Revise</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onSelectDocument(doc)}
                            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-[#ebf4fb]/50 dark:hover:bg-[#7fb2e3]/10 hover:border-[#1e4c77]/30 dark:hover:border-[#7fb2e3]/30 text-slate-700 dark:text-slate-300 hover:text-[#1e4c77] dark:hover:text-[#7fb2e3] text-xs font-normal font-inter transition-all shadow-2xs cursor-pointer group select-none"
                          >
                            <Eye className="h-3.5 w-3.5 stroke-[1.8] text-slate-400 dark:text-slate-500 group-hover:text-[#1e4c77] dark:group-hover:text-[#7fb2e3] transition-colors" />
                            <span>View</span>
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      {variant === "overview" ? (
        <div className="p-3.5 px-5 sm:px-6 border-t border-slate-100 dark:border-slate-800 bg-[#f8fafc]/80 dark:bg-slate-800/40 flex items-center justify-between text-xs font-inter font-normal text-slate-400 dark:text-slate-500">
          <span>
            Showing <span className="font-numbers text-slate-600 dark:text-slate-300">5</span> of{" "}
            <span className="font-numbers text-slate-600 dark:text-slate-300">{documents.length}</span> submissions
          </span>
        </div>
      ) : (
        <div className="p-3.5 px-5 sm:px-6 border-t border-slate-100 dark:border-slate-800 bg-[#f8fafc]/80 dark:bg-slate-800/40 flex items-center justify-between text-xs font-inter font-normal text-slate-400 dark:text-slate-500">
          <span>
            Showing <span className="font-numbers text-slate-600 dark:text-slate-300">{filteredDocuments.length}</span> of{" "}
            <span className="font-numbers text-slate-600 dark:text-slate-300">{documents.length}</span> submissions
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setTypeFilter("all");
                onResetFilters();
              }}
              className="text-xs font-normal font-inter text-[#1e4c77] dark:text-[#7fb2e3] hover:underline cursor-pointer"
            >
              Clear active filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
