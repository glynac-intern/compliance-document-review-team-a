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
  title = "Review Velocity",
}: TurnaroundVelocityCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs font-inter flex flex-col justify-between h-full">
      {/* Header */}
      <div className="pb-3.5 border-b border-slate-100 mb-4 flex items-center justify-between">
        <h2 className="text-sm sm:text-base font-normal text-slate-800 tracking-tight font-inter">
          {title}
        </h2>
        <span className="text-[11.5px] text-slate-400 font-normal font-inter">
          Time Distribution
        </span>
      </div>

      {/* Minimalist Tiers List */}
      <div className="space-y-4 pt-1">
        {tiers.map((tier) => (
          <div key={tier.rangeLabel} className="group flex items-center justify-between gap-3 text-xs">
            {/* Range Label */}
            <div className="w-28 sm:w-32 shrink-0">
              <span className="font-normal text-slate-800 font-inter group-hover:text-[#1e4c77] transition-colors truncate block">
                {tier.rangeLabel}
              </span>
            </div>

            {/* Clean Progress Bar */}
            <div className="flex-1 min-w-[60px] h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                style={{ width: `${tier.percentage}%` }}
                className="h-full rounded-full bg-[#2575bc] transition-all duration-300"
                title={`${tier.rangeLabel}: ${tier.percentage.toFixed(1)}%`}
              />
            </div>

            {/* Metrics */}
            <div className="flex items-center gap-3 shrink-0 text-right">
              <span className="text-[11.5px] text-slate-400 font-numbers tabular-nums w-16 text-right">
                {tier.count} docs
              </span>
              <span className="text-[12px] font-numbers font-medium text-[#1e4c77] tabular-nums w-12 text-right">
                {tier.percentage.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Subtle Footer */}
      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-inter font-normal">
        <span>Target SLA Adherence</span>
        <span className="font-numbers text-slate-600 font-medium">Under 24 Hours</span>
      </div>
    </div>
  );
}
