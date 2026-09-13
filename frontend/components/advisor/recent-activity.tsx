"use client";

import * as React from "react";
import {
  History,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  FileUp,
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
      action: "Revision Requested By Compliance",
      actor: "Sarah Jenkins",
      role: "officer",
      time: "25m Ago",
      type: "warning",
    },
    {
      id: "act-2",
      documentTitle: "Fixed Income Yield Advantage Flyer.pdf",
      documentId: "DOC-2026-0879",
      action: "Final Approval Certificate Issued",
      actor: "Sarah Jenkins",
      role: "officer",
      time: "2h Ago",
      type: "success",
    },
    {
      id: "act-3",
      documentTitle: "Q1 2026 Alpha Growth Fund Presentation.pdf",
      documentId: "DOC-2026-0891",
      action: "AI Pre-Screening Check Completed",
      actor: "Verity AI Engine",
      role: "ai",
      time: "Today, 9:25 AM",
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
      type: "upload",
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs font-inter">
      {/* Header: CamelCase Inter font */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
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
            <span>View All</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={1.8} />
          </button>
        )}
      </div>

      {/* Streamlined Activity Timeline List (No redundant comment boxes) */}
      <div className="divide-y divide-slate-100 pt-0.5">
        {activities.map((act) => (
          <div
            key={act.id}
            onClick={() => onItemClick && onItemClick(act.documentId)}
            className="py-3 px-2 flex items-center justify-between gap-3 hover:bg-slate-50/80 rounded-xl transition-all cursor-pointer group font-inter"
          >
            {/* Left: Unified Theme Icon & Details */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="h-8 w-8 rounded-xl bg-[#ebf4fb] border border-[#2575bc]/20 text-[#1e4c77] flex items-center justify-center shrink-0 group-hover:bg-[#1e4c77] group-hover:text-white transition-all shadow-2xs">
                {act.type === "warning" && <AlertCircle className="h-4 w-4 stroke-[1.8]" />}
                {act.type === "success" && <CheckCircle2 className="h-4 w-4 stroke-[1.8]" />}
                {act.type === "info" && <ShieldCheck className="h-4 w-4 stroke-[1.8]" />}
                {act.type === "upload" && <FileUp className="h-4 w-4 stroke-[1.8]" />}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-medium text-slate-800 group-hover:text-[#1e4c77] transition-colors font-inter">
                    {act.action}
                  </span>
                  <span className="text-slate-300 text-xs hidden sm:inline">·</span>
                  <span className="text-[12px] text-slate-500 font-inter hidden sm:inline">
                    {act.actor}
                  </span>
                </div>

                <p className="text-[12px] text-slate-400 truncate mt-0.5 font-inter">
                  {act.documentTitle}
                </p>
              </div>
            </div>

            {/* Right: Timestamp in CamelCase Inter */}
            <span className="text-[11.5px] text-slate-400 font-inter shrink-0 font-normal">
              {act.time}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
