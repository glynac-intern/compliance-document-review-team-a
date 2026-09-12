"use client";

import * as React from "react";
import { TimeSeriesPoint } from "@/types/analytics";

interface SubmissionTrendChartProps {
  data: TimeSeriesPoint[];
  title?: string;
}

export function SubmissionTrendChart({
  data,
  title = "Submission Trajectory",
}: SubmissionTrendChartProps) {
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

  // SVG dimensions
  const svgWidth = 840;
  const svgHeight = 220;
  const paddingLeft = 36;
  const paddingRight = 16;
  const paddingTop = 16;
  const paddingBottom = 32;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Max value calculation with headroom
  const maxVal = Math.max(...data.map((d) => d.total), 10);
  const yTicksCount = 4;
  const yMaxRounded = Math.ceil(maxVal / 10) * 10;
  const yTicks = Array.from({ length: yTicksCount + 1 }, (_, i) =>
    Math.round((yMaxRounded / yTicksCount) * i)
  );

  const barSlotWidth = chartWidth / data.length;
  const barWidth = Math.min(Math.max(barSlotWidth * 0.55, 12), 34);

  const hoveredPoint = hoveredIndex !== null ? data[hoveredIndex] : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs font-inter relative flex flex-col justify-between">
      {/* Header with Title and Minimalist Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-medium text-slate-800 font-inter">
            {title}
          </h2>
        </div>

        {/* Minimalist Legend strictly themed to brand blues */}
        <div className="flex items-center gap-3.5 text-[11px] text-slate-500 font-inter self-start sm:self-auto">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-xs bg-[#2575bc]" />
            <span>Approved</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-xs bg-[#4a9ae1]" />
            <span>Needs Revision</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-xs bg-[#0f2b48]" />
            <span>Rejected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-xs bg-[#93c5fd]" />
            <span>In Queue</span>
          </div>
        </div>
      </div>

      {/* SVG Chart Area */}
      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto min-w-[500px] select-none"
        >
          {/* Clip paths for each column's total bar so only the topmost edge is rounded */}
          <defs>
            {data.map((point, index) => {
              const slotX = paddingLeft + index * barSlotWidth;
              const barX = slotX + (barSlotWidth - barWidth) / 2;
              const total = point.approved + point.needsRevision + point.rejected + point.pending;
              const totalHeight = (total / yMaxRounded) * chartHeight;
              const baseY = paddingTop + chartHeight;

              return (
                <clipPath key={`clip-${point.periodKey}`} id={`clip-bar-${index}`}>
                  <rect
                    x={barX}
                    y={baseY - totalHeight}
                    width={barWidth}
                    height={totalHeight}
                    rx="3"
                    ry="3"
                  />
                </clipPath>
              );
            })}
          </defs>

          {/* Horizontal Gridlines & Y-Axis Labels */}
          {yTicks.map((val) => {
            const y = paddingTop + chartHeight - (val / yMaxRounded) * chartHeight;
            return (
              <g key={val}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] font-numbers tabular-nums font-normal"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Stacked Bars */}
          {data.map((point, index) => {
            const slotX = paddingLeft + index * barSlotWidth;
            const barX = slotX + (barSlotWidth - barWidth) / 2;
            const isHovered = hoveredIndex === index;

            // Heights
            const approvedHeight = (point.approved / yMaxRounded) * chartHeight;
            const revisionHeight = (point.needsRevision / yMaxRounded) * chartHeight;
            const rejectedHeight = (point.rejected / yMaxRounded) * chartHeight;
            const pendingHeight = (point.pending / yMaxRounded) * chartHeight;

            // Y coordinates from bottom up
            const baseY = paddingTop + chartHeight;
            const approvedY = baseY - approvedHeight;
            const revisionY = approvedY - revisionHeight;
            const rejectedY = revisionY - rejectedHeight;
            const pendingY = rejectedY - pendingHeight;

            return (
              <g
                key={point.periodKey}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer transition-opacity duration-150"
              >
                {/* Column background hover highlight zone */}
                <rect
                  x={slotX + 1}
                  y={paddingTop}
                  width={barSlotWidth - 2}
                  height={chartHeight}
                  fill={isHovered ? "rgba(37, 117, 188, 0.05)" : "transparent"}
                  rx="4"
                />

                {/* Stacked Segments enclosed in single top-rounded clipPath (crisp flat interior boundaries) */}
                <g
                  clipPath={`url(#clip-bar-${index})`}
                  opacity={hoveredIndex === null || isHovered ? 1 : 0.75}
                  className="transition-opacity duration-150"
                >
                  {/* Approved Segment (Royal Blue) */}
                  {approvedHeight > 0 && (
                    <rect
                      x={barX}
                      y={approvedY}
                      width={barWidth}
                      height={approvedHeight}
                      fill="#2575bc"
                    />
                  )}

                  {/* Needs Revision Segment (Sky Blue) */}
                  {revisionHeight > 0 && (
                    <rect
                      x={barX}
                      y={revisionY}
                      width={barWidth}
                      height={revisionHeight}
                      fill="#4a9ae1"
                    />
                  )}

                  {/* Rejected Segment (Midnight Navy) */}
                  {rejectedHeight > 0 && (
                    <rect
                      x={barX}
                      y={rejectedY}
                      width={barWidth}
                      height={rejectedHeight}
                      fill="#0f2b48"
                    />
                  )}

                  {/* Pending Segment (Ice Blue) */}
                  {pendingHeight > 0 && (
                    <rect
                      x={barX}
                      y={pendingY}
                      width={barWidth}
                      height={pendingHeight}
                      fill="#93c5fd"
                    />
                  )}
                </g>

                {/* X-Axis Label */}
                <text
                  x={slotX + barSlotWidth / 2}
                  y={baseY + 16}
                  textAnchor="middle"
                  className={
                    isHovered
                      ? "fill-slate-900 font-medium text-[11px] font-inter"
                      : "fill-slate-400 font-normal text-[10px] font-inter"
                  }
                >
                  {point.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute z-20 pointer-events-none rounded-lg border border-slate-200 bg-white p-3 shadow-lg font-inter text-xs text-slate-800 transition-all duration-100"
            style={{
              top: 10,
              left: Math.min(
                Math.max(
                  paddingLeft +
                    (hoveredIndex! * chartWidth) / data.length -
                    60,
                  10
                ),
                580
              ),
            }}
          >
            <div className="flex items-center justify-between gap-4 pb-1.5 border-b border-slate-100 mb-1.5">
              <span className="font-medium text-slate-900">
                {hoveredPoint.label} {hoveredPoint.sublabel}
              </span>
              <span className="text-[11px] text-slate-500 font-numbers tabular-nums">
                {hoveredPoint.total} filings
              </span>
            </div>

            <div className="space-y-1 text-[11px]">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[#2575bc] flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#2575bc]" />
                  Approved
                </span>
                <span className="font-numbers tabular-nums text-slate-700">
                  {hoveredPoint.approved} ({((hoveredPoint.approved / hoveredPoint.total) * 100).toFixed(0)}%)
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-[#4a9ae1] flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#4a9ae1]" />
                  Needs Revision
                </span>
                <span className="font-numbers tabular-nums text-slate-700">
                  {hoveredPoint.needsRevision} ({((hoveredPoint.needsRevision / hoveredPoint.total) * 100).toFixed(0)}%)
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-[#0f2b48] flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0f2b48]" />
                  Rejected
                </span>
                <span className="font-numbers tabular-nums text-slate-700">
                  {hoveredPoint.rejected} ({((hoveredPoint.rejected / hoveredPoint.total) * 100).toFixed(0)}%)
                </span>
              </div>

              {hoveredPoint.pending > 0 && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[#93c5fd] flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#93c5fd]" />
                    In Queue
                  </span>
                  <span className="font-numbers tabular-nums text-slate-700">
                    {hoveredPoint.pending}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
