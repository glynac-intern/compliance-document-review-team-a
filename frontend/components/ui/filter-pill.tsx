"use client";

import * as React from "react";
import { ChevronDown, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterPillProps {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

export function FilterPill({ label, options, value, onChange }: FilterPillProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const hasValue = value && value !== "all";

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[12px] font-medium transition-colors select-none",
          hasValue
            ? "border-slate-300 bg-slate-100 text-slate-800"
            : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
        )}
      >
        {hasValue ? (
          <>
            <span className="text-slate-400">{label}:</span>
            <span>{value}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onChange("all"); }}
              className="ml-0.5 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3 w-3" />
            </button>
          </>
        ) : (
          <>
            <Plus className="h-3 w-3" />
            <span>{label}</span>
          </>
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-40 min-w-[140px] rounded-md border border-slate-200 bg-white shadow-lg py-1">
          <button
            onClick={() => { onChange("all"); setOpen(false); }}
            className={cn(
              "block w-full text-left px-3 py-1.5 text-[12px] hover:bg-slate-50",
              !hasValue ? "font-medium text-slate-900" : "text-slate-500"
            )}
          >
            All
          </button>
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={cn(
                "block w-full text-left px-3 py-1.5 text-[12px] hover:bg-slate-50",
                value === opt ? "font-medium text-slate-900" : "text-slate-600"
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
