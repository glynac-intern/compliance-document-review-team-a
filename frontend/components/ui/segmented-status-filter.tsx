"use client";

import { cn } from "@/lib/utils";

export interface StatusOption {
  id: string;
  label: string;
  count: number;
}

interface SegmentedStatusFilterProps {
  options: StatusOption[];
  value: string;
  onChange: (value: string) => void;
}

export function SegmentedStatusFilter({
  options,
  value,
  onChange,
}: SegmentedStatusFilterProps) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors select-none",
              active
                ? "border-[#1e4c77] bg-[#1e4c77] text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800"
            )}
          >
            <span>{opt.label}</span>
            <span
              className={cn(
                "rounded px-1.5 py-px text-[10px] font-semibold tabular-nums",
                active ? "bg-[#143758] text-blue-100" : "bg-slate-100 text-slate-500"
              )}
            >
              {opt.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
