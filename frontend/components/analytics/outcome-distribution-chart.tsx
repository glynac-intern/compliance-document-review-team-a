"use client";

import * as React from "react";
import { OutcomeDistribution } from "@/types/analytics";
import { cn } from "@/lib/utils";

interface OutcomeDistributionChartProps {
  data: OutcomeDistribution;
  title?: string;
}

// Generates an exact SVG annular sector path (donut slice) with crisp radial seams
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

  // Donut geometry constants
  const size = 190;
  const cx = size / 2;
  const cy = size / 2;
  const rInner = 52;
  const rOuterBase = 76;
  const rOuterHover = 82;

  // Strictly brand blue monochromatic palette:
  // Approved: Royal Blue (#2575bc)
  // Needs Revision: Sky Blue (#4a9ae1)
  // Rejected: Midnight Navy (#0f2b48)
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

  // Pre-calculate exact sector angles with clean hairline separation gaps (no overlapping round caps)
  const gap = 0.032; // ~1.8 degree clean gap between slices
  let accumulatedAngle = -Math.PI / 2; // Start at 12 o'clock

  const sectorData = segments.map((seg) => {
    const spanAngle = (seg.percentage / 100) * 2 * Math.PI;
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
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs font-inter flex flex-col justify-between h-full">
      {/* Card Header (Minimal, no subtitle) */}
      <div className="pb-3 border-b border-slate-100 mb-4">
        <h2 className="text-sm font-medium text-slate-800 font-inter">
          {title}
        </h2>
      </div>

      {/* Visual & Summary Container */}
      <div className="flex flex-col items-center justify-center my-auto">
        {/* SVG Donut with mathematically exact annular sectors */}
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
              stroke="#f8fafc"
              strokeWidth={rOuterBase - rInner}
            />

            {/* Crisp Annular Sector Slices */}
            {sectorData.map((seg) => {
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
              {activeSegment
                ? segments.find((s) => s.id === activeSegment)?.count
                : data.totalReviewed}
            </span>
            <span className="text-[10px] text-slate-400 font-inter uppercase tracking-wide mt-1">
              {activeSegment
                ? `${segments.find((s) => s.id === activeSegment)?.label}`
                : "Reviewed"}
            </span>
          </div>
        </div>

        {/* Structured Outcome Ledger */}
        <div className="w-full mt-5 space-y-1.5 font-inter">
          {segments.map((seg) => {
            const isHovered = activeSegment === seg.id;

            return (
              <div
                key={seg.id}
                onMouseEnter={() => setActiveSegment(seg.id)}
                onMouseLeave={() => setActiveSegment(null)}
                className={cn(
                  "flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer text-xs",
                  isHovered ? "bg-slate-50" : "hover:bg-slate-50/70"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-2.5 w-2.5 rounded-xs shrink-0"
                    style={{ backgroundColor: seg.color }}
                  />
                  <div className="min-w-0">
                    <p className="font-normal text-slate-800 truncate">
                      {seg.label}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-right shrink-0">
                  <span className="text-slate-500 font-numbers tabular-nums">
                    {seg.count} docs
                  </span>
                  <span
                    className="font-numbers tabular-nums font-medium text-slate-900 w-12 text-right"
                    style={{ color: isHovered ? seg.color : undefined }}
                  >
                    {seg.percentage.toFixed(1)}%
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
