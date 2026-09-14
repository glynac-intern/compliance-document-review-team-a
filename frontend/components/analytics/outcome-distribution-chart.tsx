"use client";

import * as React from "react";
import { OutcomeDistribution } from "@/types/analytics";
import { cn } from "@/lib/utils";

interface OutcomeDistributionChartProps {
  data: OutcomeDistribution;
  title?: string;
}

function getAnnularSectorPath(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  startAngle: number,
  endAngle: number
): string {
  const x1 = cx + rOuter * Math.cos(startAngle);
  const y1 = cy + rOuter * Math.sin(startAngle);
  const x2 = cx + rOuter * Math.cos(endAngle);
  const y2 = cy + rOuter * Math.sin(endAngle);

  const x3 = cx + rInner * Math.cos(endAngle);
  const y3 = cy + rInner * Math.sin(endAngle);
  const x4 = cx + rInner * Math.cos(startAngle);
  const y4 = cy + rInner * Math.sin(startAngle);

  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

  return [
    `M ${x1} ${y1}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4} ${y4}`,
    `Z`,
  ].join(" ");
}

export function OutcomeDistributionChart({
  data,
  title = "Regulatory Outcomes",
}: OutcomeDistributionChartProps) {
  const [activeSegment, setActiveSegment] = React.useState<string | null>(null);

  const size = 190;
  const cx = size / 2;
  const cy = size / 2;
  const rInner = 52;
  const rOuterBase = 76;
  const rOuterHover = 82;

  const hasReviewedDocs = data.totalReviewed > 0;

  const segments = [
    {
      id: "approved",
      label: "Approved",
      count: data.approvedCount,
      percentage: data.approvedPct,
      color: "#2575bc",
    },
    {
      id: "revision",
      label: "Needs Revision",
      count: data.revisionCount,
      percentage: data.revisionPct,
      color: "#4a9ae1",
    },
    {
      id: "rejected",
      label: "Rejected",
      count: data.rejectedCount,
      percentage: data.rejectedPct,
      color: "#0f2b48",
    },
  ];

  const gap = 0.032;
  let accumulatedAngle = -Math.PI / 2;

  const sectorData = segments.map((seg) => {
    const pct = hasReviewedDocs ? seg.percentage : 0;
    const spanAngle = (pct / 100) * 2 * Math.PI;
    const startAngle = accumulatedAngle + gap / 2;
    const endAngle = accumulatedAngle + spanAngle - gap / 2;
    accumulatedAngle += spanAngle;

    return {
      ...seg,
      startAngle,
      endAngle: endAngle > startAngle ? endAngle : startAngle + 0.01,
    };
  });

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs font-inter flex flex-col justify-between h-full">
      {/* Card Header */}
      <div className="pb-3 border-b border-slate-100 mb-4">
        <h2 className="text-sm sm:text-base font-medium text-slate-800 tracking-tight font-inter">
          {title}
        </h2>
      </div>

      {/* Visual & Summary Container */}
      <div className="flex flex-col items-center justify-center my-auto">
        <div className="relative w-[190px] h-[190px] flex items-center justify-center select-none">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="overflow-visible"
          >
            {/* Background Track Ring */}
            <circle
              cx={cx}
              cy={cy}
              r={(rInner + rOuterBase) / 2}
              fill="transparent"
              stroke="#f1f5f9"
              strokeWidth={rOuterBase - rInner}
            />

            {/* Slices when real reviews exist */}
            {hasReviewedDocs &&
              sectorData.map((seg) => {
                if (seg.percentage <= 0) return null;
                const isHovered = activeSegment === seg.id;
                const isDimmed = activeSegment !== null && !isHovered;
                const rOuter = isHovered ? rOuterHover : rOuterBase;
                const pathD = getAnnularSectorPath(
                  cx,
                  cy,
                  rInner,
                  rOuter,
                  seg.startAngle,
                  seg.endAngle
                );

                return (
                  <path
                    key={seg.id}
                    d={pathD}
                    fill={seg.color}
                    className="transition-all duration-200 cursor-pointer ease-out"
                    style={{
                      opacity: isDimmed ? 0.45 : 1,
                    }}
                    onMouseEnter={() => setActiveSegment(seg.id)}
                    onMouseLeave={() => setActiveSegment(null)}
                  />
                );
              })}
          </svg>

          {/* Donut Center Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-2xl sm:text-[26px] font-bold text-slate-900 font-numbers tabular-nums leading-none">
              {hasReviewedDocs
                ? activeSegment
                  ? segments.find((s) => s.id === activeSegment)?.count
                  : data.totalReviewed
                : "00"}
            </span>
            <span className="text-[10px] text-slate-400 font-inter uppercase tracking-wider mt-1">
              {hasReviewedDocs
                ? activeSegment
                  ? segments.find((s) => s.id === activeSegment)?.label
                  : "Reviewed"
                : "No data"}
            </span>
          </div>
        </div>

        {/* Structured Outcome Ledger */}
        <div className="w-full mt-5 space-y-1.5 font-inter">
          {segments.map((seg) => {
            const isHovered = activeSegment === seg.id;
            const hasCount = hasReviewedDocs && seg.count > 0;

            return (
              <div
                key={seg.id}
                onMouseEnter={() => setActiveSegment(seg.id)}
                onMouseLeave={() => setActiveSegment(null)}
                className={cn(
                  "flex items-center justify-between py-1 px-2 rounded-lg transition-colors cursor-pointer text-xs",
                  isHovered ? "bg-slate-50" : "hover:bg-slate-50/60"
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-xs shrink-0"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="text-slate-700 font-normal">{seg.label}</span>
                </div>

                <div className="flex items-center gap-2.5 font-numbers tabular-nums text-right">
                  <span className="text-slate-400 text-[11px]">
                    {hasCount ? `${seg.count} docs` : "00 docs"}
                  </span>
                  <span className="font-medium text-slate-900 w-12 text-right">
                    {hasCount ? `${seg.percentage.toFixed(1)}%` : "No data"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
