import * as React from "react";
import { cn } from "@/lib/utils";
import { ComplianceStatus } from "@/types/compliance";

interface StatusBadgeProps {
  status: ComplianceStatus | string;
  className?: string;
  showIcon?: boolean;
}

const statusConfigs: Record<
  string,
  {
    label: string;
    text: string;
    isBold?: boolean;
  }
> = {
  approved: {
    label: "Approved",
    text: "text-status-approved-text",
    isBold: false,
  },
  needs_revision: {
    label: "Needs Revision",
    text: "text-status-revision-text",
    isBold: false,
  },
  in_review: {
    label: "In Review",
    text: "text-status-pending-text",
    isBold: false,
  },
  pending: {
    label: "Pending Review",
    text: "text-status-pending-text",
    isBold: false,
  },
  rejected: {
    label: "Rejected",
    text: "text-status-rejected-text",
    isBold: true,
  },
};

export function StatusBadge({
  status,
  className,
}: StatusBadgeProps) {
  const config = statusConfigs[status] || statusConfigs.pending;
  const { label, text, isBold } = config;

  return (
    <span
      className={cn(
        "font-inter text-[13px] select-none inline-block tracking-normal",
        text,
        isBold ? "font-bold" : "font-normal",
        className
      )}
    >
      {label}
    </span>
  );
}
