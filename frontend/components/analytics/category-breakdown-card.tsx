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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs font-inter flex flex-col justify-between h-full">
      {/* Header */}
      <div className="pb-3.5 border-b border-slate-100 mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm sm:text-base font-normal text-slate-800 tracking-tight font-inter">
            {title}
          </h2>
        </div>
        <span className="text-[11.5px] text-slate-400 font-normal font-inter">
          Clearance Rate
        </span>
      </div>

      {/* Minimalist Category Rows */}
      <div className="space-y-3.5 pt-1">
        {categories.map((cat) => (
          <div key={cat.type} className="group flex items-center justify-between gap-3 text-xs">
            {/* Category Name */}
            <div className="w-36 sm:w-44 shrink-0">
              <span className="font-normal text-slate-800 font-inter group-hover:text-[#1e4c77] transition-colors truncate block">
                {cat.type}
              </span>
            </div>

            {/* Clean Single-Hue Theme Progress Bar */}
            <div className="flex-1 min-w-[60px] h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                style={{ width: `${cat.clearanceRatePct}%` }}
                className="h-full rounded-full bg-[#2575bc] transition-all duration-300"
                title={`${cat.type}: ${cat.clearanceRatePct.toFixed(1)}% clearance`}
              />
            </div>

            {/* Metrics: Document count and clearance percentage */}
            <div className="flex items-center gap-3 shrink-0 text-right">
              <span className="text-[11.5px] text-slate-400 font-numbers tabular-nums w-16 text-right">
                {cat.totalSubmissions} docs
              </span>
              <span className="text-[12px] font-numbers font-medium text-[#1e4c77] tabular-nums w-12 text-right">
                {cat.clearanceRatePct.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Subtle Footer Note */}
      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-inter font-normal">
        <span>Total Submissions Analyzed</span>
        <span className="font-numbers text-slate-600">
          {categories.reduce((sum, c) => sum + c.totalSubmissions, 0)} documents
        </span>
      </div>
    </div>
  );
}
