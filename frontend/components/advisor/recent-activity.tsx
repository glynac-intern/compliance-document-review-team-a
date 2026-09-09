"use client";

import * as React from "react";
import {
  History,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  FileUp,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivityItem {
  id: string;
  documentTitle: string;
  documentId: string;
  action: string;
  actor: string;
  role: "officer" | "advisor" | "ai";
  time: string;
  detail: string;
  type: "warning" | "success" | "info" | "upload";
}

interface RecentActivityProps {
  onViewAllClick?: () => void;
  onItemClick?: (docId: string) => void;
}

export function RecentActivity({
  onViewAllClick,
  onItemClick,
}: RecentActivityProps) {
  const activities: ActivityItem[] = [
    {
      id: "act-1",
      documentTitle: "Retirement Horizons Client Newsletter - March 2026.docx",
      documentId: "DOC-2026-0884",
      action: "Revision Requested by Compliance",
      actor: "Sarah Jenkins",
      role: "officer",
      time: "25m ago",
      detail:
        "Please insert standard SEC Form CRS disclosure in footer of page 2 and clarify tax certainty statement.",
      type: "warning",
    },
    {
      id: "act-2",
      documentTitle: "Fixed Income Yield Advantage Flyer.pdf",
      documentId: "DOC-2026-0879",
      action: "Final Approval Certificate Issued",
      actor: "Sarah Jenkins",
      role: "officer",
      time: "2h ago",
      detail:
        "All required 30-day SEC yield disclaimers confirmed. Document cleared for public dissemination.",
      type: "success",
    },
    {
      id: "act-3",
      documentTitle: "Q1 2026 Alpha Growth Fund Presentation.pdf",
      documentId: "DOC-2026-0891",
      action: "AI Pre-screening Check Completed",
      actor: "Verity AI Engine",
      role: "ai",
      time: "Today, 9:25 AM",
      detail:
        "Detected promissory return claim on Slide 4 under FINRA Rule 2210(d)(1)(D). Passed to compliance queue.",
      type: "info",
    },
    {
      id: "act-4",
      documentTitle: "Retirement Horizons Client Newsletter (v2).docx",
      documentId: "DOC-2026-0858",
      action: "Revised Version Uploaded",
      actor: "Elena Rostova",
      role: "advisor",
      time: "Today, 10:15 AM",
      detail:
        "Updated page 2 footer with Form CRS hyperlink. Awaiting final officer sign-off.",
      type: "upload",
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs font-inter">
      {/* Header: Non-bold CamelCase Inter font */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-[#1e4c77]" strokeWidth={1.8} />
          <h3 className="text-sm sm:text-base font-normal text-slate-800 tracking-tight font-inter">
            Recent Activity
          </h3>
        </div>

        {onViewAllClick && (
          <button
            type="button"
            onClick={onViewAllClick}
            className="group inline-flex items-center gap-1 text-xs font-normal text-[#1e4c77] hover:text-[#2575bc] transition-colors cursor-pointer font-inter"
          >
            <span>View all</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={1.8} />
          </button>
        )}
      </div>

      {/* Activity Timeline List */}
      <div className="divide-y divide-slate-100 pt-1">
        {activities.map((act) => (
          <div
            key={act.id}
            onClick={() => onItemClick && onItemClick(act.documentId)}
            className="py-3 px-1.5 flex items-start gap-3 hover:bg-slate-50/70 rounded-xl transition-colors cursor-pointer group"
          >
            {/* Action Icon */}
            <div
              className={cn(
                "h-8 w-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-2xs",
                act.type === "warning" && "bg-amber-50 text-amber-800 border border-amber-200",
                act.type === "success" && "bg-emerald-50 text-emerald-800 border border-emerald-200",
                act.type === "info" && "bg-blue-50 text-[#1e4c77] border border-blue-200",
                act.type === "upload" && "bg-slate-50 text-slate-700 border border-slate-200"
              )}
            >
              {act.type === "warning" && <AlertTriangle className="h-4 w-4 stroke-[1.8]" />}
              {act.type === "success" && <CheckCircle2 className="h-4 w-4 stroke-[1.8]" />}
              {act.type === "info" && <ShieldCheck className="h-4 w-4 stroke-[1.8]" />}
              {act.type === "upload" && <FileUp className="h-4 w-4 stroke-[1.8]" />}
            </div>

            {/* Content Body */}
            <div className="flex-1 min-w-0 font-inter">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
                <p className="text-[13px] font-normal text-slate-800 group-hover:text-[#1e4c77] transition-colors font-inter">
                  {act.action}
                </p>
                <span className="text-[11px] text-slate-400 font-inter font-normal">
                  {act.time}
                </span>
              </div>

              <p className="text-[12px] font-normal text-slate-600 truncate mt-0.5 font-inter">
                {act.documentTitle}
              </p>

              <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100/80 font-inter font-normal">
                <span className="font-normal text-slate-700">{act.actor}:</span>{" "}
                {act.detail}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
