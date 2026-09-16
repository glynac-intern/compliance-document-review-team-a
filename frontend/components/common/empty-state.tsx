import * as React from "react";
import { cn } from "@/lib/utils";
import { Inbox, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  title = "No data available yet.",
  description,
  icon: Icon = Inbox,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 p-8 text-center bg-white/50 font-inter",
        className
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3 border border-slate-200">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-xs font-medium text-slate-800 mb-1">{title}</h3>
      {description && <p className="max-w-xs text-xs text-slate-500 mb-4">{description}</p>}
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction} variant="outline" className="mt-2 text-xs font-normal">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
