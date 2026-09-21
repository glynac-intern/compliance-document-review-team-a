"use client";

import * as React from "react";
import { TurnaroundTier } from "@/types/analytics";

interface TurnaroundVelocityCardProps {
  tiers: TurnaroundTier[];
  slaCompliancePct?: number;
  medianHours?: number;
  title?: string;
}

export function TurnaroundVelocityCard({
  tiers,
  slaCompliancePct = 0,
  medianHours = 0,
  title = "Review Velocity & SLA",
}: TurnaroundVelocityCardProps) {
  const totalTierDocs = tiers.reduce((sum, t) => sum + t.count, 0);
  const hasTurnaroundData = totalTierDocs > 0;

  return (
    <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs font-inter flex flex-col justify-between h-full">
      {/* Header */}
      <div className="pb-3 border-b border-slate-100 dark:border-slate-800 mb-4 flex items-center justify-between">
        <h2 className="text-sm sm:text-base font-medium text-slate-800 dark:text-slate-100 tracking-tight font-inter">
          {title}
        </h2>
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 font-inter">
          Target: 24h
        </span>
      </div>

      {/* Minimalist Key Stats Split */}
      <div className="grid grid-cols-2 gap-3 mb-4 p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700">
        <div>
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 block font-inter">
            SLA Adherence (24h)
          </span>
          <span className="text-lg sm:text-xl font-bold font-numbers tabular-nums text-slate-900 dark:text-slate-100 mt-0.5 block">
            {hasTurnaroundData && slaCompliancePct > 0 ? (
              `${slaCompliancePct.toFixed(1)}%`
            ) : (
              <span className="text-slate-400 dark:text-slate-500 font-normal text-sm">No data</span>
            )}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 block font-inter">
            Median Review Speed
          </span>
          <span className="text-lg sm:text-xl font-bold font-numbers tabular-nums text-slate-900 dark:text-slate-100 mt-0.5 block">
            {hasTurnaroundData && medianHours > 0 ? (
              `${medianHours.toFixed(1)}h`
            ) : (
              <span className="text-slate-400 dark:text-slate-500 font-normal text-sm">No data</span>
            )}
          </span>
        </div>
      </div>

      {/* Minimalist Tiers List */}
      <div className="space-y-3 pt-0.5">
        {tiers.map((tier) => {
          const hasDocs = tier.count > 0;

          return (
            <div
              key={tier.rangeLabel}
              className="group flex items-center justify-between gap-3 text-xs"
            >
              {/* Range Label */}
              <div className="w-28 sm:w-32 shrink-0">
                <span className="font-normal text-slate-700 dark:text-slate-300 font-inter group-hover:text-[#1e4c77] dark:group-hover:text-[#7fb2e3] transition-colors truncate block">
                  {tier.rangeLabel}
                </span>
              </div>

              {/* Minimalist Hairline Progress Bar */}
              <div className="flex-1 min-w-[60px] h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  style={{ width: `${hasDocs ? tier.percentage : 0}%` }}
                  className="h-full rounded-full bg-[#1e4c77] dark:bg-[#7fb2e3] transition-all duration-300"
                />
              </div>

              {/* Metrics */}
              <div className="flex items-center gap-3 shrink-0 text-right">
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-numbers tabular-nums w-14 text-right">
                  {hasDocs ? `${tier.count} docs` : "00 docs"}
                </span>
                <span className="text-[12px] font-numbers font-medium tabular-nums w-14 text-right">
                  {hasDocs && tier.percentage > 0 ? (
                    <span className="text-[#1e4c77] dark:text-[#7fb2e3]">{tier.percentage.toFixed(1)}%</span>
                  ) : hasDocs ? (
                    <span className="text-slate-500 dark:text-slate-400">00%</span>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500 font-normal">No data</span>
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 font-inter">
        <span>Turnaround Distribution</span>
        <span className="font-numbers text-slate-600 dark:text-slate-400 font-medium">
          {hasTurnaroundData ? `${totalTierDocs} reviews` : "No data"}
        </span>
      </div>
    </div>
  );
}
