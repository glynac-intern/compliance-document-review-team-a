import * as React from "react";
import { cn } from "@/lib/utils";

export type ComplianceStatus =
  | "approved"
  | "needs_revision"
  | "revision_requested"
  | "rejected"
  | "pending_review"
  | "pending"
  | "in_review"
  | "draft";

export type SeverityLevel = "high" | "medium" | "low" | "info";

interface StatusBadgeProps {
  status: ComplianceStatus | string;
  className?: string;
  showDot?: boolean;
}

interface SeverityBadgeProps {
  severity: SeverityLevel | string;
  className?: string;
  showDot?: boolean;
}

export function StatusBadge({
  status,
  className,
  showDot = true,
}: StatusBadgeProps) {
  const normalized = status.toLowerCase().replace(/-/g, "_");

  let label = "Pending Review";
  let colorStyles = "bg-blue-50 text-blue-800 border-blue-200";
  let dotColor = "bg-blue-600";

  switch (normalized) {
    case "approved":
      label = "Approved";
      colorStyles = "bg-emerald-50 text-emerald-800 border-emerald-200";
      dotColor = "bg-emerald-600";
      break;
    case "needs_revision":
    case "revision_requested":
      label = "Needs Revision";
      colorStyles = "bg-amber-50 text-amber-800 border-amber-200";
      dotColor = "bg-amber-600";
      break;
    case "rejected":
      label = "Rejected";
      colorStyles = "bg-rose-50 text-rose-800 border-rose-200";
      dotColor = "bg-rose-600";
      break;
    case "in_review":
      label = "In Review";
      colorStyles = "bg-indigo-50 text-indigo-800 border-indigo-200";
      dotColor = "bg-indigo-600";
      break;
    case "draft":
      label = "Draft";
      colorStyles = "bg-slate-100 text-slate-700 border-slate-200";
      dotColor = "bg-slate-400";
      break;
    case "pending":
    case "pending_review":
    default:
      label = "Pending Review";
      colorStyles = "bg-blue-50 text-blue-800 border-blue-200";
      dotColor = "bg-blue-600";
      break;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px] font-medium tracking-tight whitespace-nowrap",
        colorStyles,
        className
      )}
    >
      {showDot && (
        <span
          className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotColor)}
          aria-hidden="true"
        />
      )}
      <span>{label}</span>
    </span>
  );
}

export function SeverityBadge({
  severity,
  className,
  showDot = true,
}: SeverityBadgeProps) {
  const normalized = severity.toLowerCase();

  let label = "Low";
  let colorStyles = "bg-slate-100 text-slate-800 border-slate-200";
  let dotColor = "bg-slate-500";

  switch (normalized) {
    case "high":
      label = "High Severity";
      colorStyles = "bg-rose-50 text-rose-800 border-rose-200";
      dotColor = "bg-rose-600";
      break;
    case "medium":
      label = "Medium Severity";
      colorStyles = "bg-amber-50 text-amber-800 border-amber-200";
      dotColor = "bg-amber-600";
      break;
    case "low":
      label = "Low Severity";
      colorStyles = "bg-blue-50 text-blue-800 border-blue-200";
      dotColor = "bg-blue-600";
      break;
    default:
      label = severity.toUpperCase();
      break;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap",
        colorStyles,
        className
      )}
    >
      {showDot && (
        <span
          className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotColor)}
          aria-hidden="true"
        />
      )}
      <span>{label}</span>
    </span>
  );
}
