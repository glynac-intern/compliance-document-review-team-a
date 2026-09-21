"use client";

/**
 * Review Decision Panel — Minimalistic regulatory determination controls.
 *
 * Designed with a compact, elegant footprint:
 * - Slim horizontal segmented pill selectors (Approve, Revision, Reject)
 * - Minimalist commentary input
 * - Compact authoritative submit action
 */

import * as React from "react";
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types & Props
// ---------------------------------------------------------------------------

export type ReviewDecision = "approved" | "needs_revision" | "rejected";

export interface ReviewDecisionPanelProps {
  documentStatus?: string;
  onSubmitDecision: (decision: ReviewDecision, comment: string) => Promise<void>;
  disabled?: boolean;
  externalComment?: string;
}

const DECISIONS: {
  value: ReviewDecision;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  activeStyle: string;
}[] = [
  {
    value: "approved",
    label: "Approve",
    icon: CheckCircle2,
    activeStyle: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-600 text-emerald-700 dark:text-emerald-300 font-semibold shadow-2xs",
  },
  {
    value: "needs_revision",
    label: "Revision",
    icon: AlertCircle,
    activeStyle: "bg-amber-50 dark:bg-amber-950/40 border-amber-500 dark:border-amber-600 text-amber-800 dark:text-amber-300 font-semibold shadow-2xs",
  },
  {
    value: "rejected",
    label: "Reject",
    icon: XCircle,
    activeStyle: "bg-rose-50 dark:bg-rose-950/40 border-rose-500 dark:border-rose-600 text-rose-700 dark:text-rose-300 font-semibold shadow-2xs",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReviewDecisionPanel({
  documentStatus,
  onSubmitDecision,
  disabled = false,
  externalComment,
}: ReviewDecisionPanelProps) {
  const [selectedDecision, setSelectedDecision] = React.useState<ReviewDecision | null>(null);
  const [comment, setComment] = React.useState(externalComment ?? "");
  const [prevExternal, setPrevExternal] = React.useState(externalComment);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [showConfirm, setShowConfirm] = React.useState(false);

  // Sync external comment if updated from Verity AI
  if (externalComment !== prevExternal) {
    setPrevExternal(externalComment);
    if (externalComment) {
      setComment(externalComment);
    }
  }

  const isAlreadyDecided = documentStatus === "approved" || documentStatus === "rejected";

  const canSubmit =
    selectedDecision !== null &&
    comment.trim().length > 0 &&
    !isSubmitting &&
    !disabled &&
    !isAlreadyDecided;

  const handleSubmitClick = () => {
    if (!canSubmit) return;
    setShowConfirm(true);
  };

  const handleConfirmedSubmit = async () => {
    if (!selectedDecision || !comment.trim()) return;
    setShowConfirm(false);
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmitDecision(selectedDecision, comment.trim());
      // TA-69: Reset form state after successful submission so the UI
      // cleanly transitions to the "already decided" locked state.
      setSelectedDecision(null);
      setComment("");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to record determination.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="border-t border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md font-inter shrink-0 p-3 space-y-2.5 shadow-2xs">
      {/* Already decided notice */}
      {isAlreadyDecided && (
        <div className="px-3 py-1.5 rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 flex items-center justify-between">
          <span>
            Determination recorded: <strong className="capitalize">{documentStatus}</strong>
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-300 uppercase font-medium tracking-wider">
            Audit Locked
          </span>
        </div>
      )}

      <div className={cn("space-y-2", isAlreadyDecided && "opacity-40 pointer-events-none")}>
        {/* 1. SLIM HORIZONTAL DECISION PILLS */}
        <div className="flex items-center gap-1.5">
          {DECISIONS.map((option) => {
            const Icon = option.icon;
            const isActive = selectedDecision === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelectedDecision(option.value)}
                disabled={disabled || isSubmitting}
                className={cn(
                  "flex-1 h-8 rounded-lg border text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer disabled:opacity-40 font-inter",
                  isActive
                    ? option.activeStyle
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>

        {/* 2. COMPACT COMMENTARY INPUT */}
        <div className="relative">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={disabled || isSubmitting}
            rows={2}
            placeholder="Review comments..."
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 px-2.5 py-1.5 text-[11px] text-slate-800 dark:text-slate-100 font-inter placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none transition-all focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:ring-1 focus:ring-[#1e4c77] focus:border-[#1e4c77] disabled:opacity-50 leading-relaxed"
          />
        </div>

        {/* 3. ERROR ALERT */}
        {submitError && (
          <div className="flex items-center gap-1.5 p-1.5 rounded bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-[10px] text-rose-700 dark:text-rose-300">
            <AlertCircle className="h-3 w-3 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {/* 4. CONFIRMATION OVERLAY */}
        {showConfirm && (
          <div className="p-2 rounded-lg border border-[#1e4c77]/20 dark:border-[#7fb2e3]/25 bg-[#1e4c77]/5 dark:bg-[#7fb2e3]/10 flex items-center justify-between text-[11px] text-slate-800 dark:text-slate-100 animate-in fade-in">
            <span>Confirm decision?</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleConfirmedSubmit}
                className="px-2.5 py-1 rounded bg-[#1e4c77] text-white text-[10px] font-medium hover:bg-[#163c60] cursor-pointer"
              >
                Submit
              </button>
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* 5. MINIMALIST SUBMIT BUTTON */}
        {!showConfirm && (
          <button
            type="button"
            onClick={handleSubmitClick}
            disabled={!canSubmit}
            className={cn(
              "w-full h-8 rounded-lg text-[11px] font-semibold transition-all duration-150 flex items-center justify-center gap-1.5 font-inter",
              canSubmit
                ? "bg-[#1e4c77] text-white hover:bg-[#163c60] shadow-2xs active:scale-[0.99] cursor-pointer"
                : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200/50 dark:border-slate-700/50"
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit"
            )}
          </button>
        )}
      </div>
    </div>
  );
}
