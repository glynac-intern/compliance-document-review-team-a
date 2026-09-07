"use client";

import * as React from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterOption {
  id: string;
  label: string;
  count?: number;
}

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusChange: (status: string) => void;
  statusOptions: FilterOption[];
  typeFilter?: string;
  onTypeChange?: (type: string) => void;
  typeOptions?: string[];
  placeholder?: string;
  className?: string;
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  statusOptions,
  typeFilter,
  onTypeChange,
  typeOptions,
  placeholder = "Filter items...",
  className,
}: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-200",
        className
      )}
    >
      {/* Segmented Status Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
        {statusOptions.map((option) => {
          const isActive = statusFilter === option.id;
          return (
            <button
              key={option.id}
              onClick={() => onStatusChange(option.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all select-none whitespace-nowrap",
                isActive
                  ? "bg-slate-900 text-white shadow-2xs font-semibold"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <span>{option.label}</span>
              {typeof option.count === "number" && (
                <span
                  className={cn(
                    "rounded px-1.5 py-0.2 text-[10px] font-mono",
                    isActive
                      ? "bg-slate-800 text-slate-200"
                      : "bg-slate-100 text-slate-600"
                  )}
                >
                  {option.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search and Secondary Filter */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 sm:w-60">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className="h-7 w-full rounded-md border border-slate-200 bg-white pl-8 pr-7 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {typeOptions && onTypeChange && (
          <select
            value={typeFilter || "all"}
            onChange={(e) => onTypeChange(e.target.value)}
            className="h-7 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
          >
            <option value="all">All Types</option>
            {typeOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
