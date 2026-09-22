import * as React from "react";
import { cn } from "@/lib/utils";

export type FileFormat = "pdf" | "doc" | "xls" | "ppt" | "default";

export interface FileTypeIconProps {
  filename?: string;
  type?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Resolves file format from file extension or document type string.
 */
export function resolveFileFormat(filename?: string, type?: string): FileFormat {
  const nameLower = (filename || "").toLowerCase();
  const typeLower = (type || "").toLowerCase();

  if (nameLower.endsWith(".pdf") || nameLower.includes(".pdf") || typeLower.includes("pdf")) {
    return "pdf";
  }

  if (
    nameLower.endsWith(".docx") ||
    nameLower.endsWith(".doc") ||
    nameLower.includes(".doc") ||
    typeLower.includes("letter") ||
    typeLower.includes("word") ||
    typeLower.includes("post")
  ) {
    return "doc";
  }

  if (
    nameLower.endsWith(".xlsx") ||
    nameLower.endsWith(".xls") ||
    nameLower.endsWith(".csv") ||
    typeLower.includes("spreadsheet") ||
    typeLower.includes("model") ||
    typeLower.includes("excel")
  ) {
    return "xls";
  }

  if (
    nameLower.endsWith(".pptx") ||
    nameLower.endsWith(".ppt") ||
    typeLower.includes("presentation") ||
    typeLower.includes("deck") ||
    typeLower.includes("slides")
  ) {
    return "ppt";
  }

  return "default";
}

/**
 * Distinguishable, theme-harmonized SVG file icon with folded sheet and format badge.
 */
export function FileTypeIcon({
  filename,
  type,
  size = "md",
  className,
}: FileTypeIconProps) {
  const format = resolveFileFormat(filename, type);

  const dimensionMap = {
    sm: { box: 28, rounded: "rounded-lg" },
    md: { box: 36, rounded: "rounded-xl" },
    lg: { box: 44, rounded: "rounded-2xl" },
  };

  const dim = dimensionMap[size] || dimensionMap.md;

  // Format theme tokens: Harmonious with Verity's corporate palette
  const themeConfig = {
    pdf: {
      plateBg: "bg-rose-50/80 dark:bg-rose-950/40",
      plateBorder: "border-rose-200/70 dark:border-rose-800/50",
      sheetStroke: "#f43f5e",
      sheetFill: "#ffffff",
      foldStroke: "#f43f5e",
      badgeBg: "#e11d48",
      badgeText: "PDF",
      decorLine: "#fca5a5",
    },
    doc: {
      plateBg: "bg-[#ebf4fb] dark:bg-[#1e4c77]/20",
      plateBorder: "border-[#2575bc]/25 dark:border-[#2575bc]/40",
      sheetStroke: "#2575bc",
      sheetFill: "#ffffff",
      foldStroke: "#2575bc",
      badgeBg: "#1e4c77",
      badgeText: "DOC",
      decorLine: "#93c5fd",
    },
    xls: {
      plateBg: "bg-emerald-50/80 dark:bg-emerald-950/40",
      plateBorder: "border-emerald-200/70 dark:border-emerald-800/50",
      sheetStroke: "#10b981",
      sheetFill: "#ffffff",
      foldStroke: "#10b981",
      badgeBg: "#047857",
      badgeText: "XLS",
      decorLine: "#6ee7b7",
    },
    ppt: {
      plateBg: "bg-amber-50/80 dark:bg-amber-950/40",
      plateBorder: "border-amber-200/70 dark:border-amber-800/50",
      sheetStroke: "#f59e0b",
      sheetFill: "#ffffff",
      foldStroke: "#f59e0b",
      badgeBg: "#b45309",
      badgeText: "PPT",
      decorLine: "#fcd34d",
    },
    default: {
      plateBg: "bg-slate-100 dark:bg-slate-800",
      plateBorder: "border-slate-200 dark:border-slate-700",
      sheetStroke: "#64748b",
      sheetFill: "#ffffff",
      foldStroke: "#64748b",
      badgeBg: "#475569",
      badgeText: "FILE",
      decorLine: "#cbd5e1",
    },
  }[format];

  return (
    <div
      className={cn(
        "flex items-center justify-center shrink-0 border transition-transform duration-150 select-none",
        dim.rounded,
        themeConfig.plateBg,
        themeConfig.plateBorder,
        className
      )}
      style={{ width: dim.box, height: dim.box }}
      title={`${themeConfig.badgeText} Document`}
      role="img"
      aria-label={`${themeConfig.badgeText} Document`}
    >
      <svg
        width={dim.box}
        height={dim.box}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full p-1"
      >
        {/* Document Sheet with folded top-right corner */}
        <path
          d="M9.5 7.5C9.5 6.39543 10.3954 5.5 11.5 5.5H20.5L26.5 11.5V28.5C26.5 29.6046 25.6046 30.5 24.5 30.5H11.5C10.3954 30.5 9.5 29.6046 9.5 28.5V7.5Z"
          fill={themeConfig.sheetFill}
          stroke={themeConfig.sheetStroke}
          strokeWidth="1.25"
          strokeLinejoin="round"
        />

        {/* 45-degree Corner Fold */}
        <path
          d="M20.5 5.5V10.75C20.5 11.1642 20.8358 11.5 21.25 11.5H26.5"
          stroke={themeConfig.foldStroke}
          strokeWidth="1.25"
          strokeLinejoin="round"
        />

        {/* Decorative detail lines in top half */}
        {format === "xls" ? (
          <g opacity="0.8">
            <line x1="12.5" y1="11" x2="18.5" y2="11" stroke={themeConfig.decorLine} strokeWidth="1" strokeLinecap="round" />
            <line x1="12.5" y1="14" x2="23.5" y2="14" stroke={themeConfig.decorLine} strokeWidth="1" strokeLinecap="round" />
            <line x1="17.5" y1="10" x2="17.5" y2="15" stroke={themeConfig.decorLine} strokeWidth="1" strokeLinecap="round" />
          </g>
        ) : format === "ppt" ? (
          <g opacity="0.85">
            <line x1="13" y1="14" x2="13" y2="12.5" stroke={themeConfig.sheetStroke} strokeWidth="1.4" strokeLinecap="round" />
            <line x1="16.5" y1="14" x2="16.5" y2="10.5" stroke={themeConfig.sheetStroke} strokeWidth="1.4" strokeLinecap="round" />
            <line x1="20" y1="14" x2="20" y2="11.5" stroke={themeConfig.sheetStroke} strokeWidth="1.4" strokeLinecap="round" />
          </g>
        ) : (
          <g opacity="0.75">
            <line x1="12.5" y1="11" x2="18" y2="11" stroke={themeConfig.decorLine} strokeWidth="1.1" strokeLinecap="round" />
            <line x1="12.5" y1="14" x2="23.5" y2="14" stroke={themeConfig.decorLine} strokeWidth="1.1" strokeLinecap="round" />
          </g>
        )}

        {/* Distinct Bold Badge Pill in lower half */}
        <rect
          x="11.5"
          y="18.5"
          width="13"
          height="8.5"
          rx="2"
          fill={themeConfig.badgeBg}
        />
        <text
          x="18"
          y="24.8"
          textAnchor="middle"
          fill="#ffffff"
          fontSize="6"
          fontWeight="700"
          fontFamily="Inter, sans-serif"
          letterSpacing="0.4"
        >
          {themeConfig.badgeText}
        </text>
      </svg>
    </div>
  );
}
