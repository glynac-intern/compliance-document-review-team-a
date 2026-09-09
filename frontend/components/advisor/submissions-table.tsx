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
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden font-sans">
      {/* Table Section Header matching the user's sketch: 'Recent Submissions' + 'all documents' */}
      <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Recent Submissions
          </h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs font-semibold text-slate-500">
              all documents ({filteredDocuments.length})
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setTypeFilter("all");
                  onResetFilters();
                }}
                className="text-[11px] font-medium text-[#2575bc] hover:underline cursor-pointer"
              >
                Reset filters
              </button>
            )}
          </div>
        </div>

        {/* Controls bar directly matching the sketch: [ Search ] [ status ] [ last updated ] [ filters ] */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-60 min-w-[180px]">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search..."
              className="w-full h-9 pl-9 pr-7 rounded-xl bg-[#f4f6f8] border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#2575bc] focus:ring-2 focus:ring-[#2575bc]/15 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Status Dropdown Filter matching sketch 'status' */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="h-9 rounded-xl bg-[#f4f6f8] border border-slate-200 text-xs font-medium text-slate-700 pl-3 pr-8 focus:outline-none focus:bg-white focus:border-[#2575bc] transition-all cursor-pointer appearance-none"
            >
              <option value="all">status: all</option>
              <option value="pending">pending review</option>
              <option value="approved">approved</option>
              <option value="needs_revision">needs revision</option>
              <option value="rejected">rejected</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-3 h-3 w-3 text-slate-400 pointer-events-none" />
          </div>

          {/* Last Updated Sorting matching sketch 'last updated' */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value as any)}
              className="h-9 rounded-xl bg-[#f4f6f8] border border-slate-200 text-xs font-medium text-slate-700 pl-3 pr-8 focus:outline-none focus:bg-white focus:border-[#2575bc] transition-all cursor-pointer appearance-none"
            >
              <option value="newest">last updated</option>
              <option value="oldest">oldest first</option>
              <option value="title">title a-z</option>
            </select>
            <ArrowUpDown className="absolute right-2.5 top-3 h-3 w-3 text-slate-400 pointer-events-none" />
          </div>

          {/* Filters Toggle Button matching sketch 'filters' */}
          <button
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={cn(
              "h-9 px-3 rounded-xl border border-slate-200 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer",
              showAdvancedFilters || typeFilter !== "all"
                ? "bg-[#1e4c77] text-white border-[#1e4c77]"
                : "bg-[#f4f6f8] text-slate-700 hover:bg-slate-200/70"
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>filters</span>
          </button>
        </div>
      </div>

      {/* Advanced Filter Drawer when toggled */}
      {showAdvancedFilters && (
        <div className="bg-slate-50/80 px-5 sm:px-6 py-3 border-b border-slate-200 flex items-center gap-3 flex-wrap text-xs">
          <span className="font-semibold text-slate-700">Document Type:</span>
          {["all", "Presentation / Deck", "Client Letter", "Promotional Brochure", "Social Media Post"].map(
            (t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer",
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
            <tr className="border-b border-slate-200 bg-[#f8fafc] text-[11px] font-bold text-slate-500 uppercase tracking-wider font-sans">
              <th className="py-3 px-5 sm:px-6">Document Name & ID</th>
              <th className="py-3 px-3">Type</th>
              <th className="py-3 px-3">Submitted</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">Reviewer</th>
              <th className="py-3 px-5 sm:px-6 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredDocuments.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center">
                  <div className="max-w-xs mx-auto flex flex-col items-center">
                    <div className="h-10 w-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                      <FileText className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-semibold text-slate-900">
                      No matching submissions
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      No documents match the current filter or search criteria.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setTypeFilter("all");
                        onResetFilters();
                      }}
                      className="mt-3 text-xs font-semibold text-[#1e4c77] hover:underline cursor-pointer"
                    >
                      Reset all filters
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredDocuments.map((doc) => {
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
                        <div className="h-9 w-9 rounded-xl bg-blue-50/70 text-[#1e4c77] flex items-center justify-center shrink-0 group-hover:bg-[#1e4c77] group-hover:text-white transition-colors">
                          <FileText className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0 max-w-[240px] sm:max-w-xs md:max-w-sm">
                          <p className="font-semibold text-slate-900 truncate group-hover:text-[#1e4c77] transition-colors text-[13px]">
                            {doc.title}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 font-roboto">
                            <span className="font-medium text-slate-500">{doc.id}</span>
                            <span>·</span>
                            <span>v{doc.version}</span>
                            <span>·</span>
                            <span>{doc.file_size_mb} MB</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Document Type */}
                    <td className="py-3.5 px-3 whitespace-nowrap text-slate-600 font-medium text-[12.5px]">
                      {doc.type}
                    </td>

                    {/* Submitted Date */}
                    <td className="py-3.5 px-3 whitespace-nowrap text-slate-600 font-roboto text-[12px] tabular-nums">
                      {formatDate(doc.uploaded_at)}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <StatusBadge status={doc.status} />
                    </td>

                    {/* Reviewer */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {doc.officer_name ? (
                        <span className="text-[12px] font-medium text-slate-700">
                          {doc.officer_name}
                        </span>
                      ) : (
                        <span className="text-[12px] text-slate-400 italic font-roboto">
                          Assigned to Queue
                        </span>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td
                      className="py-3.5 px-5 sm:px-6 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isNeedsRevision ? (
                        <button
                          type="button"
                          onClick={() => onReviseClick(doc)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1e4c77] hover:bg-[#163e63] text-white text-[11.5px] font-bold transition-all shadow-xs cursor-pointer"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Revise</span>
                        </button>
                      ) : isApproved ? (
                        <button
                          type="button"
                          onClick={() => onCertificateClick(doc)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11.5px] font-semibold transition-all cursor-pointer shadow-2xs"
                        >
                          <FileCheck className="h-3.5 w-3.5" />
                          <span>Certificate</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onSelectDocument(doc)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11.5px] font-medium transition-all cursor-pointer shadow-2xs"
                        >
                          <Eye className="h-3.5 w-3.5 text-slate-500" />
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
      <div className="p-3.5 px-5 sm:px-6 border-t border-slate-100 bg-[#f8fafc]/80 flex items-center justify-between text-xs text-slate-500">
        <span>
          Showing {filteredDocuments.length} of {documents.length} submissions
        </span>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              setTypeFilter("all");
              onResetFilters();
            }}
            className="text-[11px] font-medium text-[#1e4c77] hover:underline cursor-pointer"
          >
            Clear active filters
          </button>
        )}
      </div>
    </div>
  );
}
