"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AIFlag } from "@/types/compliance";

interface DecisionPanelProps {
  flags: AIFlag[];
  onSubmitDecision: (decision: {
    decision: "approved" | "rejected" | "revision_requested";
    comments: string;
    flagDispositions: { passage: string; confirmed: boolean }[];
  }) => void;
}

export function DecisionPanel({ flags, onSubmitDecision }: DecisionPanelProps) {
  const [decision, setDecision] = React.useState<"approved" | "rejected" | "revision_requested" | null>(null);
  const [comments, setComments] = React.useState("");
  const [flagStates, setFlagStates] = React.useState<Record<number, boolean>>({});
  const [showConfirm, setShowConfirm] = React.useState(false);

  const needsComments = decision === "rejected" || decision === "revision_requested";
  const canSubmit = decision !== null && (!needsComments || comments.trim().length > 0);

  const handleSubmit = () => {
    if (!decision) return;
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }
    onSubmitDecision({
      decision,
      comments,
      flagDispositions: flags.map((f, i) => ({
        passage: f.passage,
        confirmed: flagStates[i] ?? false,
      })),
    });
  };

  const decisionOptions = [
    { value: "approved" as const, label: "Approve", color: "border-emerald-300 bg-emerald-50 text-emerald-800", activeColor: "ring-emerald-400" },
    { value: "revision_requested" as const, label: "Request revision", color: "border-amber-300 bg-amber-50 text-amber-800", activeColor: "ring-amber-400" },
    { value: "rejected" as const, label: "Reject", color: "border-rose-300 bg-rose-50 text-rose-800", activeColor: "ring-rose-400" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-slate-200 px-3 py-1.5 bg-slate-50/80 shrink-0">
        <span className="text-[12px] font-medium text-slate-700">Decision</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Decision radio group */}
        <div className="space-y-1.5">
          {decisionOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setDecision(opt.value); setShowConfirm(false); }}
              className={cn(
                "flex items-center gap-2 w-full rounded-md border px-3 py-2 text-[12px] font-medium transition-all text-left",
                decision === opt.value
                  ? cn(opt.color, "ring-1", opt.activeColor)
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              )}
            >
              <span className={cn(
                "h-3 w-3 rounded-full border-2 shrink-0 flex items-center justify-center",
                decision === opt.value ? "border-current" : "border-slate-300"
              )}>
                {decision === opt.value && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
              </span>
              {opt.label}
            </button>
          ))}
        </div>

        {/* Comments */}
        {decision && (
          <div>
            <label className="text-[11px] font-medium text-slate-600 block mb-1">
              {needsComments ? "Feedback (required)" : "Comments (optional)"}
            </label>
            <Textarea
              value={comments}
              onChange={(e) => { setComments(e.target.value); setShowConfirm(false); }}
              placeholder="Specific deficiencies, required edits, or statutory references..."
              rows={4}
            />
          </div>
        )}

        {/* AI flag review */}
        {flags.length > 0 && (
          <div>
            <span className="text-[11px] font-medium text-slate-600 block mb-1.5">AI flag review</span>
            <div className="space-y-1">
              {flags.map((flag, i) => (
                <label key={i} className="flex items-start gap-2 text-[11px] text-slate-700 cursor-pointer py-1">
                  <input
                    type="checkbox"
                    checked={flagStates[i] ?? false}
                    onChange={(e) => setFlagStates({ ...flagStates, [i]: e.target.checked })}
                    className="mt-0.5 h-3 w-3 rounded border-slate-300"
                  />
                  <span className="leading-snug">
                    <span className={cn(
                      "font-medium",
                      flag.severity === "high" ? "text-rose-700" : flag.severity === "medium" ? "text-amber-700" : "text-blue-700"
                    )}>
                      Confirm:
                    </span>{" "}
                    {flag.passage.slice(0, 60)}...
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Submit footer */}
      <div className="border-t border-slate-200 p-3 bg-white shrink-0">
        {showConfirm ? (
          <div className="space-y-2">
            <p className="text-[11px] text-slate-500 text-center">Confirm submission? This action is logged.</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowConfirm(false)}>Cancel</Button>
              <Button size="sm" className="flex-1" onClick={handleSubmit} disabled={!canSubmit}>Confirm</Button>
            </div>
          </div>
        ) : (
          <Button size="sm" className="w-full" disabled={!canSubmit} onClick={handleSubmit}>
            Submit Decision
          </Button>
        )}
        <p className="text-[10px] text-slate-400 text-center mt-1.5">Logged to tamper-evident audit trail</p>
      </div>
    </div>
  );
}
