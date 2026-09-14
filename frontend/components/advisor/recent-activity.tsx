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
        <div className="h-7 w-7 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
          <Check className="h-3.5 w-3.5 stroke-[2.4]" />
        </div>
      );
    case "revision":
      return (
        <div className="h-7 w-7 rounded-lg bg-amber-50 border border-amber-200/80 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs">
          <RotateCcw className="h-3.5 w-3.5 stroke-[2]" />
        </div>
      );
    case "rejected":
      return (
        <div className="h-7 w-7 rounded-lg bg-rose-50 border border-rose-200/80 text-rose-700 flex items-center justify-center shrink-0 shadow-2xs">
          <X className="h-3.5 w-3.5 stroke-[2.2]" />
        </div>
      );
    case "screening":
      return (
        <div className="h-7 w-7 rounded-lg bg-blue-50 border border-blue-200/80 text-[#1e4c77] flex items-center justify-center shrink-0 shadow-2xs">
          <Search className="h-3.5 w-3.5 stroke-[2]" />
        </div>
      );
    case "submission":
    default:
      return (
        <div className="h-7 w-7 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
          <FileUp className="h-3.5 w-3.5 stroke-[1.9]" />
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
    action: "Pre-Screen Completed",
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
}: RecentActivityProps) {
  const [filterType, setFilterType] = React.useState<string>("all");

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

  const filteredActivities = React.useMemo(() => {
    if (filterType === "all") return allActivities;
    return allActivities.filter((a) => a.type === filterType);
  }, [allActivities, filterType]);

  const displayActivities = isFullHistory
    ? filteredActivities
    : allActivities.slice(0, 4);

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs font-inter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-[#1e4c77]" strokeWidth={1.8} />
          <h2 className="text-sm sm:text-base font-medium text-slate-800 tracking-tight font-inter">
            {title || (isFullHistory ? "Activity History" : "Recent Activity")}
          </h2>
          {isFullHistory && allActivities.length > 0 && (
            <span className="text-[11px] text-slate-400 font-normal font-inter ml-1">
              ({allActivities.length})
            </span>
          )}
        </div>

        {/* Action / Filters */}
        {isFullHistory ? (
          <div className="flex items-center gap-1 text-[11px] font-inter">
            {[
              { id: "all", label: "All" },
              { id: "approved", label: "Approved" },
              { id: "revision", label: "Revisions" },
              { id: "submission", label: "Submissions" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterType(f.id)}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-colors cursor-pointer font-medium",
                  filterType === f.id
                    ? "bg-[#1e4c77] text-white"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        ) : (
          onViewAllClick && (
            <button
              type="button"
              onClick={onViewAllClick}
              className="group inline-flex items-center gap-1 text-xs font-normal text-[#1e4c77] hover:text-[#2575bc] transition-colors cursor-pointer font-inter"
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
      {displayActivities.length === 0 ? (
        <div className="py-8 text-center space-y-1 font-inter">
          <p className="text-xs font-medium text-slate-600">No activity recorded</p>
          <p className="text-[11px] text-slate-400">
            Submissions and compliance decisions will appear here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 pt-0.5">
          {displayActivities.map((act) => (
            <div
              key={act.id}
              onClick={() => onItemClick && onItemClick(act.documentId)}
              className="py-3 px-2 flex items-center justify-between gap-3 hover:bg-slate-50/80 rounded-xl transition-all cursor-pointer group font-inter"
            >
              {/* Left: Purposeful Semantic Icon & Clean Details */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {renderActivityIcon(act.type)}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-slate-800 group-hover:text-[#1e4c77] transition-colors font-inter">
                      {act.action}
                    </span>
                  </div>

                  <p className="text-[12px] text-slate-500 truncate mt-0.5 font-inter">
                    {act.documentTitle}
                  </p>
                </div>
              </div>

              {/* Right: Timestamp */}
              <span className="text-[11.5px] text-slate-400 font-inter font-numbers tabular-nums shrink-0 font-normal">
                {act.time}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
