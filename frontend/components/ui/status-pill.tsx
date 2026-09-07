import { cn } from "@/lib/utils";
import { Check, X, AlertTriangle, Clock } from "lucide-react";

type StatusType = "pending" | "in_review" | "approved" | "needs_revision" | "rejected" | string;

const config: Record<string, { label: string; icon: React.ElementType; dot: string; bg: string; text: string; border: string }> = {
  pending: { label: "Pending", icon: Clock, dot: "bg-blue-500", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  in_review: { label: "In Review", icon: Clock, dot: "bg-indigo-500", bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  approved: { label: "Approved", icon: Check, dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  needs_revision: { label: "Revision", icon: AlertTriangle, dot: "bg-amber-500", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  rejected: { label: "Rejected", icon: X, dot: "bg-rose-500", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
};

export function StatusPill({ status, className }: { status: StatusType; className?: string }) {
  const c = config[status] || config.pending;
  const Icon = c.icon;

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap", c.bg, c.text, c.border, className)}>
      <Icon className="h-3 w-3" />
      {c.label}
    </span>
  );
}
