"use client";

import * as React from "react";
import {
  History,
  ArrowRight,
  Check,
  RotateCcw,
  X,
  FileUp,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ComplianceDocument } from "@/types/compliance";

export interface ActivityItem {
  id: string;
  documentTitle: string;
  documentId: string;
  action: string;
  time: string;
  type: "approved" | "revision" | "rejected" | "submission" | "screening";
  timestamp?: number;
}

interface RecentActivityProps {
  documents?: ComplianceDocument[];
  title?: string;
  isFullHistory?: boolean;
  onViewAllClick?: () => void;
  onItemClick?: (docId: string) => void;
  isLoading?: boolean;
  loadError?: string | null;
  onRetry?: () => void;
}

function formatRelativeTime(isoString?: string | null): string {
  if (!isoString) return "Recently";
  const diff = Date.now() - new Date(isoString).getTime();
  if (isNaN(diff)) return isoString;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(isoString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function renderActivityIcon(type: ActivityItem["type"]) {
  switch (type) {
    case "approved":
      return (
        <div className="h-8 w-8 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-status-approved-text flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-white dark:group-hover:bg-slate-700 group-hover:border-slate-300 dark:group-hover:border-slate-600 transition-colors">
          <Check className="h-4 w-4 stroke-[2.2]" />
        </div>
      );
    case "revision":
      return (
        <div className="h-8 w-8 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-status-revision-text flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-white dark:group-hover:bg-slate-700 group-hover:border-slate-300 dark:group-hover:border-slate-600 transition-colors">
          <RotateCcw className="h-4 w-4 stroke-[2]" />
        </div>
      );
    case "rejected":
      return (
        <div className="h-8 w-8 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-status-rejected-text flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-white dark:group-hover:bg-slate-700 group-hover:border-slate-300 dark:group-hover:border-slate-600 transition-colors">
          <X className="h-4 w-4 stroke-[2.2]" />
        </div>
      );
    case "screening":
      return (
        <div className="h-8 w-8 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-[#1e4c77] dark:text-[#7fb2e3] flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-white dark:group-hover:bg-slate-700 group-hover:border-slate-300 dark:group-hover:border-slate-600 transition-colors">
          <Search className="h-4 w-4 stroke-[2]" />
        </div>
      );
    case "submission":
    default:
      return (
        <div className="h-8 w-8 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-[#1e4c77] dark:text-[#7fb2e3] flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-white dark:group-hover:bg-slate-700 group-hover:border-slate-300 dark:group-hover:border-slate-600 transition-colors">
          <FileUp className="h-4 w-4 stroke-[1.9]" />
        </div>
      );
  }
}

const FALLBACK_ACTIVITIES: ActivityItem[] = [
  {
    id: "act-1",
    documentTitle: "Retirement Horizons Newsletter.docx",
    documentId: "DOC-2026-0884",
    action: "Revision Requested",
    time: "25m ago",
    type: "revision",
  },
  {
    id: "act-2",
    documentTitle: "Fixed Income Yield Advantage.pdf",
    documentId: "DOC-2026-0879",
    action: "Approved",
    time: "2h ago",
    type: "approved",
  },
  {
    id: "act-3",
    documentTitle: "Alpha Growth Fund Presentation.pdf",
    documentId: "DOC-2026-0891",
    action: "AI Review Completed",
    time: "Today, 9:25 AM",
    type: "screening",
  },
  {
    id: "act-4",
    documentTitle: "Retirement Horizons Newsletter (v2).docx",
    documentId: "DOC-2026-0858",
    action: "Revision Uploaded",
    time: "Today, 10:15 AM",
    type: "submission",
  },
];

export function RecentActivity({
  documents,
  title,
  isFullHistory = false,
  onViewAllClick,
  onItemClick,
  isLoading = false,
  loadError = null,
  onRetry,
}: RecentActivityProps) {
  const [filterType, setFilterType] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  const allActivities = React.useMemo<ActivityItem[]>(() => {
    if (!documents) {
      return FALLBACK_ACTIVITIES;
    }

    if (documents.length === 0) {
      return [];
    }

    const items: ActivityItem[] = [];

    for (const doc of documents) {
      const s = doc.status;
      const docTitle = doc.title || "Untitled Document";
      const docId = doc.id;

      if (s === "approved") {
        items.push({
          id: `approved-${docId}`,
          documentTitle: docTitle,
          documentId: docId,
          action: "Approved",
          time: formatRelativeTime(doc.reviewed_at || doc.uploaded_at),
          type: "approved",
          timestamp: new Date(doc.reviewed_at || doc.uploaded_at).getTime(),
        });
      } else if (s === "needs_revision") {
        items.push({
          id: `revision-${docId}`,
          documentTitle: docTitle,
          documentId: docId,
          action: "Revision Requested",
          time: formatRelativeTime(doc.reviewed_at || doc.uploaded_at),
          type: "revision",
          timestamp: new Date(doc.reviewed_at || doc.uploaded_at).getTime(),
        });
      } else if (s === "rejected") {
        items.push({
          id: `rejected-${docId}`,
          documentTitle: docTitle,
          documentId: docId,
          action: "Rejected",
          time: formatRelativeTime(doc.reviewed_at || doc.uploaded_at),
          type: "rejected",
          timestamp: new Date(doc.reviewed_at || doc.uploaded_at).getTime(),
        });
      }

      // Document submission event
      items.push({
        id: `submission-${docId}`,
        documentTitle: docTitle,
        documentId: docId,
        action: doc.version > 1 ? `Revision (v${doc.version}) Uploaded` : "Submitted for Review",
        time: formatRelativeTime(doc.uploaded_at),
        type: "submission",
        timestamp: new Date(doc.uploaded_at).getTime(),
      });
    }

    return items.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
  }, [documents]);

  const activityCounts = React.useMemo(() => {
    return {
      all: allActivities.length,
      approved: allActivities.filter((a) => a.type === "approved").length,
      revision: allActivities.filter((a) => a.type === "revision").length,
      submission: allActivities.filter((a) => a.type === "submission").length,
    };
  }, [allActivities]);

  const filteredActivities = React.useMemo(() => {
    let result = allActivities;
    if (filterType !== "all") {
      result = result.filter((a) => a.type === filterType);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.documentTitle.toLowerCase().includes(q) ||
          a.action.toLowerCase().includes(q) ||
          a.documentId.toLowerCase().includes(q)
      );
    }
    return result;
  }, [allActivities, filterType, searchQuery]);

  const displayActivities = isFullHistory
    ? filteredActivities
    : allActivities.slice(0, 4);

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs font-inter overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-[#1e4c77] dark:text-[#7fb2e3]" strokeWidth={1.8} />
          <h2 className="text-sm sm:text-base font-medium text-slate-800 dark:text-slate-100 tracking-tight font-inter">
            {title || (isFullHistory ? "Activity Log" : "Recent Activity")}
          </h2>
          {isFullHistory && allActivities.length > 0 && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-numbers ml-1">
              ({filteredActivities.length} of {allActivities.length})
            </span>
          )}
        </div>

        {/* Action / Full History Filters */}
        {isFullHistory ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            {/* Search filter for history */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-48 h-8 pl-8 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#1e4c77] dark:focus:border-[#7fb2e3] focus:ring-1 focus:ring-[#1e4c77]/20 dark:focus:ring-[#7fb2e3]/25 transition-all font-inter"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 text-xs font-inter flex-wrap">
              {[
                { id: "all", label: "All", count: activityCounts.all },
                { id: "approved", label: "Approved", count: activityCounts.approved },
                { id: "revision", label: "Revisions", count: activityCounts.revision },
                { id: "submission", label: "Submissions", count: activityCounts.submission },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterType(f.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer font-inter",
                    filterType === f.id
                      ? "bg-[#1e4c77] text-white font-medium shadow-2xs"
                      : "bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-700/80 font-normal"
                  )}
                >
                  <span>{f.label}</span>
                  <span
                    className={cn(
                      "text-[10px] font-numbers tabular-nums px-1.5 py-0.2 rounded-full",
                      filterType === f.id ? "bg-white/20 text-white" : "bg-slate-200/70 dark:bg-slate-700/70 text-slate-600 dark:text-slate-400"
                    )}
                  >
                    {f.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          onViewAllClick && (
            <button
              type="button"
              onClick={onViewAllClick}
              className="group inline-flex items-center gap-1 text-xs font-normal text-[#1e4c77] dark:text-[#7fb2e3] hover:text-[#2575bc] dark:hover:text-[#a6cdf0] transition-colors cursor-pointer font-inter"
            >
              <span>View All</span>
              <ArrowRight
                className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                strokeWidth={1.8}
              />
            </button>
          )
        )}
      </div>

      {/* Activities List */}
      {loadError ? (
        <div className="py-10 text-center space-y-2 font-inter px-4">
          <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{loadError}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="text-xs text-[#1e4c77] dark:text-[#7fb2e3] hover:underline font-medium cursor-pointer"
            >
              Retry
            </button>
          )}
        </div>
      ) : isLoading ? (
        <div className="py-10 text-center text-slate-400 dark:text-slate-500 text-xs font-inter flex items-center justify-center gap-2">
          <span className="h-4 w-4 rounded-full border-2 border-slate-300 dark:border-slate-600 border-t-[#1e4c77] dark:border-t-[#7fb2e3] animate-spin" />
          <span>Loading activity...</span>
        </div>
      ) : displayActivities.length === 0 ? (
        <div className="py-10 text-center space-y-2 font-inter">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400">No activity records found</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            {searchQuery ? "No entries match your search query." : "Activity events will appear here."}
          </p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setFilterType("all");
              }}
              className="text-xs text-[#1e4c77] dark:text-[#7fb2e3] hover:underline font-medium pt-1 cursor-pointer"
            >
              Reset filters
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800 p-2 sm:p-3">
          {displayActivities.map((act) => (
            <div
              key={act.id}
              onClick={() => onItemClick && onItemClick(act.documentId)}
              className="py-3 px-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 rounded-xl transition-all cursor-pointer group font-inter"
            >
              {/* Left: Purposeful Semantic Icon & Clean Details */}
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                {renderActivityIcon(act.type)}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-medium text-slate-800 dark:text-slate-100 group-hover:text-[#1e4c77] dark:group-hover:text-[#7fb2e3] transition-colors font-inter">
                      {act.action}
                    </span>
                  </div>

                  <p className="text-[12px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-inter">
                    {act.documentTitle}
                  </p>
                </div>
              </div>

              {/* Right: Timestamp & Prompt */}
              <div className="flex items-center gap-2.5 shrink-0">
                <span className="text-[11.5px] text-slate-400 dark:text-slate-500 font-inter font-numbers tabular-nums font-normal">
                  {act.time}
                </span>
                {isFullHistory && (
                  <ArrowRight
                    className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 group-hover:text-[#1e4c77] dark:group-hover:text-[#7fb2e3] group-hover:translate-x-0.5 transition-all opacity-0 group-hover:opacity-100"
                    strokeWidth={1.8}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
