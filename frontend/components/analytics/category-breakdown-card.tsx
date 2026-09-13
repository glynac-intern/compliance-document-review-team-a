"use client";

import * as React from "react";
import { CategoryMetric } from "@/types/analytics";

interface CategoryBreakdownCardProps {
  categories: CategoryMetric[];
  title?: string;
}

export function CategoryBreakdownCard({
  categories,
  title = "Throughput by Category",
}: CategoryBreakdownCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs font-inter flex flex-col justify-between h-full">
      {/* Header (Minimal, with subtle clearance indicator) */}
      <div className="pb-3 border-b border-slate-100 mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-800 font-inter">
          {title}
        </h2>
        <span className="text-[11px] text-slate-400 font-normal">
          Clearance Rate
        </span>
      </div>

      {/* Category List with ample horizontal spacing so labels never truncate */}
      <div className="space-y-3 pt-0.5">
        {categories.map((cat) => {
          const approvedPct = (cat.approvedCount / cat.totalSubmissions) * 100;
          const revisionPct = (cat.revisionCount / cat.totalSubmissions) * 100;
          const rejectedPct = (cat.rejectedCount / cat.totalSubmissions) * 100;

          return (
            <div key={cat.type} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-normal text-slate-800">
                  {cat.type}
                </span>

                <div className="flex items-center gap-2 text-[11px] shrink-0">
                  <span className="text-slate-500 font-numbers tabular-nums">
                    {cat.totalSubmissions} docs
                  </span>
                  <span className="text-slate-400 font-numbers tabular-nums">
                    · {cat.avgTurnaroundHours}h
                  </span>
                  <span className="font-numbers tabular-nums font-medium text-[#1e4c77] bg-[#ebf4fb] px-1.5 py-0.5 rounded border border-[#b9d7f2] w-14 text-center">
                    {cat.clearanceRatePct.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Segmented Volume Proportion Bar (Brand blues only) */}
              <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden flex">
                <div
                  style={{ width: `${approvedPct}%` }}
                  className="h-full bg-[#2575bc] transition-all duration-300"
                  title={`Approved: ${cat.approvedCount} (${approvedPct.toFixed(0)}%)`}
                />
                <div
                  style={{ width: `${revisionPct}%` }}
                  className="h-full bg-[#4a9ae1] transition-all duration-300"
                  title={`Needs Revision: ${cat.revisionCount} (${revisionPct.toFixed(0)}%)`}
                />
                <div
                  style={{ width: `${rejectedPct}%` }}
                  className="h-full bg-[#0f2b48] transition-all duration-300"
                  title={`Rejected: ${cat.rejectedCount} (${rejectedPct.toFixed(0)}%)`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
