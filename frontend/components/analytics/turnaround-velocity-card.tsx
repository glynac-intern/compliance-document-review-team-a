"use client";

import * as React from "react";
import { TurnaroundTier } from "@/types/analytics";

interface TurnaroundVelocityCardProps {
  tiers: TurnaroundTier[];
  slaCompliancePct: number;
  medianHours: number;
  title?: string;
}

export function TurnaroundVelocityCard({
  tiers,
  slaCompliancePct,
  medianHours,
  title = "Review Velocity & SLA",
}: TurnaroundVelocityCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs font-inter flex flex-col justify-between h-full">
      {/* Header (Minimal, no subtitle) */}
      <div className="pb-3 border-b border-slate-100 mb-4">
        <h2 className="text-sm font-medium text-slate-800 font-inter">
          {title}
        </h2>
      </div>

      {/* Elegant Typographic SLA Benchmark Strip (No AI-slop shield/squircle icon) */}
      <div className="rounded-xl bg-slate-50/90 border border-slate-200/80 p-4 mb-4">
        <div className="flex items-baseline justify-between mb-2.5">
          <div>
            <span className="text-[11px] font-normal text-slate-500 uppercase tracking-wide block">
              SLA Adherence (24h Target)
            </span>
            <span className="text-2xl font-bold font-numbers tabular-nums text-[#1e4c77] leading-tight">
              {slaCompliancePct.toFixed(1)}%
            </span>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-normal text-slate-500 uppercase tracking-wide block">
              Median Speed
            </span>
            <span className="text-2xl font-bold font-numbers tabular-nums text-slate-900 leading-tight">
              {medianHours.toFixed(1)}h
            </span>
          </div>
        </div>

        {/* Sleek hairline precision adherence bar */}
        <div className="w-full h-1.5 rounded-full bg-slate-200/80 overflow-hidden">
          <div
            style={{ width: `${slaCompliancePct}%` }}
            className="h-full rounded-full bg-[#1e4c77] transition-all duration-300"
          />
        </div>
      </div>

      {/* Tiers List (Clean, without repetitive descriptive sublabels) */}
      <div className="space-y-3 pt-0.5">
        {tiers.map((tier) => (
          <div key={tier.rangeLabel} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="h-2 w-2 rounded-xs shrink-0"
                  style={{ backgroundColor: tier.color }}
                />
                <span className="font-normal text-slate-800 font-inter truncate">
                  {tier.rangeLabel}
                </span>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-slate-500 text-[11px] font-numbers tabular-nums">
                  {tier.count} docs
                </span>
                <span className="font-numbers tabular-nums text-slate-900 font-medium text-[11.5px] w-12 text-right">
                  {tier.percentage.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Proportion Bar */}
            <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                style={{
                  width: `${tier.percentage}%`,
                  backgroundColor: tier.color,
                }}
                className="h-full rounded-full transition-all duration-300"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
