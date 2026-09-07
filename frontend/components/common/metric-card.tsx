import * as React from "react";
import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
    isNeutral?: boolean;
  };
  icon?: LucideIcon;
  className?: string;
}

export function MetricCard({
  title,
  value,
  description,
  trend,
  icon: Icon,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-slate-200 bg-white p-3.5 shadow-2xs transition-shadow hover:shadow-xs",
        className
      )}
    >
      <div className="flex items-center justify-between text-slate-500 mb-1">
        <span className="text-[11px] font-medium tracking-tight uppercase text-slate-500">
          {title}
        </span>
        {Icon && <Icon className="h-3.5 w-3.5 text-slate-400" />}
      </div>
      <div className="flex items-baseline gap-2">
        <div className="text-xl font-bold tracking-tight text-slate-900 tabular-nums">
          {value}
        </div>
        {trend && (
          <span
            className={cn(
              "text-[10px] font-medium tabular-nums",
              trend.isNeutral
                ? "text-slate-500"
                : trend.isPositive
                ? "text-emerald-700 font-semibold"
                : "text-rose-700 font-semibold"
            )}
          >
            {trend.value}
          </span>
        )}
      </div>
      {description && (
        <p className="mt-1 text-[11px] text-slate-500 truncate">{description}</p>
      )}
    </div>
  );
}
