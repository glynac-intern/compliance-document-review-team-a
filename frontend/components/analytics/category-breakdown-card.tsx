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
  const totalDocs = categories.reduce((sum, c) => sum + c.totalSubmissions, 0);

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs font-inter flex flex-col justify-between h-full">
      {/* Header */}
      <div className="pb-3 border-b border-slate-100 mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm sm:text-base font-medium text-slate-800 tracking-tight font-inter">
            {title}
          </h2>
        </div>
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 font-inter">
          Clearance Rate
        </span>
      </div>

      {/* Minimalist Category Rows */}
      {totalDocs === 0 ? (
        <div className="py-10 text-center space-y-1 font-inter">
          <p className="text-xs font-medium text-slate-500">No document records found</p>
          <p className="text-[11px] text-slate-400">
            Throughput metrics will populate automatically as submissions are processed.
          </p>
        </div>
      ) : (
        <div className="space-y-3 pt-0.5">
          {categories.map((cat) => {
            const hasDocs = cat.totalSubmissions > 0;
            const hasClearance = hasDocs && cat.clearanceRatePct > 0;

            return (
              <div
                key={cat.type}
                className="group flex items-center justify-between gap-3 text-xs"
              >
                {/* Category Name */}
                <div className="w-40 sm:w-48 shrink-0">
                  <span className="font-normal text-slate-700 font-inter group-hover:text-[#1e4c77] transition-colors truncate block">
                    {cat.type}
                  </span>
                </div>

                {/* Minimalist Hairline Progress Bar */}
                <div className="flex-1 min-w-[60px] h-1 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    style={{ width: `${hasDocs ? cat.clearanceRatePct : 0}%` }}
                    className="h-full rounded-full bg-[#1e4c77] transition-all duration-300"
                  />
                </div>

                {/* Metrics: Document count and clearance percentage */}
                <div className="flex items-center gap-3 shrink-0 text-right">
                  <span className="text-[11px] text-slate-400 font-numbers tabular-nums w-14 text-right">
                    {hasDocs ? `${cat.totalSubmissions} docs` : "00 docs"}
                  </span>
                  <span className="text-[12px] font-numbers font-medium tabular-nums w-14 text-right">
                    {hasClearance ? (
                      <span className="text-[#1e4c77]">{cat.clearanceRatePct.toFixed(1)}%</span>
                    ) : hasDocs ? (
                      <span className="text-slate-500">00%</span>
                    ) : (
                      <span className="text-slate-400 font-normal">No data</span>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-inter">
        <span>Total Submissions Analyzed</span>
        <span className="font-numbers text-slate-600 font-medium">
          {totalDocs > 0 ? `${totalDocs} documents` : "00 documents"}
        </span>
      </div>
    </div>
  );
}
