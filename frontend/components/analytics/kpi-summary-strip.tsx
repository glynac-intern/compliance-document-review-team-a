"use client";

import * as React from "react";
import { OperationalKPIs } from "@/types/analytics";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiSummaryStripProps {
  kpis: OperationalKPIs;
  labels?: {
    total?: string;
    approved?: string;
    revisions?: string;
    rejections?: string;
    velocity?: string;
  };
}

export function KpiSummaryStrip({ kpis, labels }: KpiSummaryStripProps) {
  const hasData = kpis.totalSubmissions > 0;

  const cards = [
    {
      id: "total",
      label: labels?.total ?? "Total Submissions",
      value: hasData ? kpis.totalSubmissions.toLocaleString() : "00",
      delta: hasData && kpis.totalSubmissionsDeltaPct !== 0 ? kpis.totalSubmissionsDeltaPct : undefined,
      gradient: "from-[#1b4a74] via-[#215e96] to-[#163f64]",
      hoverGradient: "hover:from-[#20588a] hover:via-[#276eaf] hover:to-[#1a4975]",
    },
    {
      id: "approved",
      label: labels?.approved ?? "Approval Rate",
      value: hasData && kpis.approvalRatePct > 0 ? `${kpis.approvalRatePct.toFixed(1)}%` : hasData ? "00%" : "No data",
      delta: hasData && kpis.approvalRateDeltaPct !== 0 ? kpis.approvalRateDeltaPct : undefined,
      gradient: "from-[#1a4872] via-[#205b92] to-[#153e63]",
      hoverGradient: "hover:from-[#1f5688] hover:via-[#256aab] hover:to-[#194772]",
    },
    {
      id: "revisions",
      label: labels?.revisions ?? "Revision Rate",
      value: hasData && kpis.revisionRatePct > 0 ? `${kpis.revisionRatePct.toFixed(1)}%` : hasData ? "00%" : "No data",
      delta: hasData && kpis.revisionRateDeltaPct !== 0 ? kpis.revisionRateDeltaPct : undefined,
      gradient: "from-[#18456e] via-[#1e578c] to-[#143a5d]",
      hoverGradient: "hover:from-[#1d5283] hover:via-[#2365a3] hover:to-[#17436b]",
    },
    {
      id: "rejections",
      label: labels?.rejections ?? "Rejection Rate",
      value: hasData && kpis.rejectionRatePct > 0 ? `${kpis.rejectionRatePct.toFixed(1)}%` : hasData ? "00%" : "No data",
      delta: hasData && kpis.rejectionRateDeltaPct !== 0 ? kpis.rejectionRateDeltaPct : undefined,
      gradient: "from-[#1e4c77] via-[#24619a] to-[#18446c]",
      hoverGradient: "hover:from-[#225a8c] hover:via-[#2871b3] hover:to-[#1b4b77]",
    },
    {
      id: "velocity",
      label: labels?.velocity ?? "Median Turnaround",
      value: hasData && kpis.medianTurnaroundHours > 0 ? `${kpis.medianTurnaroundHours.toFixed(1)}h` : "No data",
      subtext: hasData && kpis.slaCompliancePct > 0 ? `${kpis.slaCompliancePct.toFixed(1)}% SLA` : undefined,
      gradient: "from-[#17426b] via-[#1f558a] to-[#133758]",
      hoverGradient: "hover:from-[#1c4e7d] hover:via-[#24639f] hover:to-[#173e63]",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4 select-none font-inter">
      {cards.map((card) => {
        const hasDelta = card.delta !== undefined;
        const isUp = (card.delta ?? 0) >= 0;

        return (
          <div
            key={card.id}
            className={cn(
              "group relative text-left p-4 sm:p-5 rounded-2xl bg-gradient-to-br transition-all duration-200 ease-out cursor-pointer overflow-hidden border border-white/10 flex flex-col justify-between",
              card.gradient,
              card.hoverGradient,
              "hover:-translate-y-0.5 hover:border-white/30 hover:shadow-lg shadow-sm",
              "active:scale-[0.98]"
            )}
          >
            <span className="font-inter text-xs sm:text-[13px] font-normal text-blue-100/90 tracking-normal truncate">
              {card.label}
            </span>

            <div className="my-1.5">
              <span className="font-numbers font-geometric text-2xl sm:text-3xl lg:text-[32px] font-bold text-white tracking-tight tabular-nums leading-none">
                {card.value}
              </span>
            </div>

            <div className="flex items-center gap-1 text-[11px] font-inter min-h-[16px]">
              {hasDelta ? (
                <span className="inline-flex items-center gap-0.5 font-numbers tabular-nums font-normal text-blue-200/90">
                  {isUp ? (
                    <ArrowUpRight className="h-3 w-3 stroke-[2] text-blue-200" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 stroke-[2] text-blue-200" />
                  )}
                  <span>{Math.abs(card.delta!)}% vs prior</span>
                </span>
              ) : card.subtext ? (
                <span className="text-blue-200/80 font-numbers tabular-nums">
                  {card.subtext}
                </span>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
