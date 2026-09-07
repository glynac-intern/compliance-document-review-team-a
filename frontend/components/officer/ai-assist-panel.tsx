"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Sparkles, RefreshCw, AlertCircle, CheckCircle2, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIAnalysis, AIFlag } from "@/types/compliance";

interface AIAssistPanelProps {
  analysis: AIAnalysis | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onSelectFlag: (flag: AIFlag) => void;
  selectedFlagIndex: number | null;
}

function FlagCard({
  flag,
  index,
  isSelected,
  onSelect,
}: {
  flag: AIFlag;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const severityConfig = {
    high: { label: "HIGH", bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", dot: "bg-rose-500" },
    medium: { label: "MED", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-500" },
    low: { label: "LOW", bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", dot: "bg-blue-500" },
  };
  const sev = severityConfig[flag.severity] || severityConfig.low;

  return (
    <button
      onClick={onSelect}
      className={cn(
        "block w-full text-left rounded-md border p-3 transition-colors",
        isSelected ? "border-[#2575bc] bg-[#ebf4fb] ring-1 ring-[#2575bc]/40" : "border-slate-200 bg-white hover:border-slate-300"
      )}
    >
      {/* Severity + Rule */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-px text-[10px] font-bold", sev.bg, sev.text, sev.border, "border")}>
            <span className={cn("h-1.5 w-1.5 rounded-full", sev.dot)} />
            {sev.label}
          </span>
          <span className="text-[11px] font-medium text-slate-700">Flag {index + 1}</span>
        </div>
        {flag.rule_id && (
          <span className="text-[10px] font-mono text-slate-400">{flag.rule_id.split("(")[0].trim()}</span>
        )}
      </div>

      {/* Passage */}
      <p className="text-[11px] text-slate-600 italic leading-snug mb-1.5 line-clamp-2">
        &ldquo;{flag.passage}&rdquo;
      </p>

      {/* Explanation */}
      <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">
        {flag.explanation}
      </p>

      {/* Locate action */}
      <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600">
        <MapPin className="h-3 w-3" />
        <span>Locate in document</span>
      </div>
    </button>
  );
}

export function AIAssistPanel({
  analysis,
  isLoading,
  error,
  onRetry,
  onSelectFlag,
  selectedFlagIndex,
}: AIAssistPanelProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-1.5 bg-slate-50/80 shrink-0">
        <div className="flex items-center gap-1.5 text-[12px]">
          <Sparkles className="h-3.5 w-3.5 text-slate-400" />
          {isLoading ? (
            <span className="text-slate-500 flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Analyzing...
            </span>
          ) : error ? (
            <span className="text-rose-600 font-medium">Analysis failed</span>
          ) : analysis && analysis.flags.length > 0 ? (
            <span className="text-slate-700 font-medium">{analysis.flags.length} flag{analysis.flags.length > 1 ? "s" : ""} found</span>
          ) : (
            <span className="text-emerald-600 font-medium">No issues</span>
          )}
        </div>
        <Button size="xs" variant="ghost" onClick={onRetry} disabled={isLoading} className="text-slate-500 h-6">
          <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Error state */}
        {error && (
          <div className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-800">
            <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
            <div>
              <p className="font-medium">{error}</p>
              <p className="text-rose-600 text-[11px] mt-0.5">Officer may proceed with manual review.</p>
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-3">
            <div className="h-16 bg-slate-100 rounded-md animate-pulse" />
            <div className="h-24 bg-slate-100 rounded-md animate-pulse" />
            <div className="h-24 bg-slate-100 rounded-md animate-pulse" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && analysis && analysis.flags.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-6 w-6 text-emerald-400 mb-2" />
            <p className="text-[12px] font-medium text-slate-700">No compliance issues detected</p>
            <p className="text-[11px] text-slate-400 mt-0.5">AI screening found no flagged passages.</p>
          </div>
        )}

        {/* Summary + Flags */}
        {!isLoading && !error && analysis && analysis.flags.length > 0 && (
          <>
            {/* Summary */}
            <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5 text-[12px] text-slate-700 leading-snug">
              {analysis.summary}
            </div>

            {/* Flags */}
            {analysis.flags.map((flag, i) => (
              <FlagCard
                key={i}
                flag={flag}
                index={i}
                isSelected={selectedFlagIndex === i}
                onSelect={() => onSelectFlag(flag)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
