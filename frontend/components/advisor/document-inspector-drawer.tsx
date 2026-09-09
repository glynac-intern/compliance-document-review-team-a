"use client";

import * as React from "react";
import {
  X,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Edit3,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  Info,
} from "lucide-react";
import { ComplianceDocument } from "@/types/compliance";
import { MOCK_AI_ANALYSIS, MOCK_DOCUMENT_CONTENT } from "@/lib/mock-data";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

interface DocumentInspectorDrawerProps {
  document: ComplianceDocument | null;
  onClose: () => void;
  onReviseClick: (doc: ComplianceDocument) => void;
}

export function DocumentInspectorDrawer({
  document: doc,
  onClose,
  onReviseClick,
}: DocumentInspectorDrawerProps) {
  if (!doc) return null;

  const aiData = MOCK_AI_ANALYSIS[doc.id];
  const docSnippets = MOCK_DOCUMENT_CONTENT[doc.id];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs font-sans select-none animate-in fade-in duration-200">
      {/* Click outside to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer Body */}
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 overflow-hidden border-l border-slate-200 animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-[#f8fafc]">
          <div className="min-w-0 flex-1 pr-3">
            <div className="flex items-center gap-2 mb-1.5">
              <StatusBadge status={doc.status} />
              <span className="text-xs font-semibold text-slate-500 font-roboto">
                {doc.id} · v{doc.version}
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900 leading-snug break-words">
              {doc.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close inspector"
            className="h-8 w-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Status Pipeline Stepper */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-roboto mb-3">
              Review Pipeline Progress
            </p>
            <div className="flex items-center justify-between text-xs font-medium text-slate-600">
              <div className="flex flex-col items-center gap-1">
                <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">
                  ✓
                </div>
                <span className="text-[10px] text-slate-500">Submitted</span>
              </div>
              <div className="h-0.5 flex-1 bg-emerald-200 mx-1" />

              <div className="flex flex-col items-center gap-1">
                <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">
                  ✓
                </div>
                <span className="text-[10px] text-slate-500">AI Screen</span>
              </div>
              <div
                className={cn(
                  "h-0.5 flex-1 mx-1",
                  doc.status === "pending" ? "bg-slate-200" : "bg-emerald-200"
                )}
              />

              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center font-bold text-[10px]",
                    doc.status === "in_review"
                      ? "bg-blue-100 text-[#1e4c77] ring-2 ring-blue-400"
                      : doc.status === "approved" || doc.status === "needs_revision"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-400"
                  )}
                >
                  {doc.status === "approved" || doc.status === "needs_revision"
                    ? "✓"
                    : "3"}
                </div>
                <span className="text-[10px] text-slate-500">Officer Review</span>
              </div>
              <div
                className={cn(
                  "h-0.5 flex-1 mx-1",
                  doc.status === "approved"
                    ? "bg-emerald-200"
                    : doc.status === "needs_revision"
                    ? "bg-amber-200"
                    : "bg-slate-200"
                )}
              />

              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center font-bold text-[10px]",
                    doc.status === "approved"
                      ? "bg-emerald-600 text-white"
                      : doc.status === "needs_revision"
                      ? "bg-amber-500 text-white"
                      : "bg-slate-100 text-slate-400"
                  )}
                >
                  {doc.status === "approved"
                    ? "✓"
                    : doc.status === "needs_revision"
                    ? "!"
                    : "4"}
                </div>
                <span className="text-[10px] font-semibold text-slate-900">
                  {doc.status === "approved"
                    ? "Approved"
                    : doc.status === "needs_revision"
                    ? "Revision"
                    : "Decision"}
                </span>
              </div>
            </div>
          </div>

          {/* Compliance Officer Feedback (If Needs Revision or has feedback) */}
          {doc.officer_feedback && (
            <div
              className={cn(
                "rounded-xl p-4 border",
                doc.status === "needs_revision"
                  ? "bg-amber-50/70 border-amber-200"
                  : "bg-blue-50/60 border-blue-200"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white",
                    doc.status === "needs_revision" ? "bg-amber-600" : "bg-[#1e4c77]"
                  )}
                >
                  SJ
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    {doc.officer_name || "Compliance Officer"}
                  </p>
                  <p className="text-[10px] text-slate-500 font-roboto">
                    Officer Review Feedback · {doc.reviewed_at ? "Mar 04, 2026" : "Recent"}
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-800 leading-relaxed font-sans bg-white/80 p-3 rounded-lg border border-amber-200/60">
                &ldquo;{doc.officer_feedback}&rdquo;
              </p>
            </div>
          )}

          {/* AI Pre-Screen Analysis Summary */}
          {aiData && (
            <div className="rounded-xl border border-slate-200 p-4 bg-white">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-[#2575bc]" />
                  <h4 className="text-xs font-bold text-slate-900">
                    AI Pre-Screen Observations
                  </h4>
                </div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase font-roboto">
                  Rule Citations
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                {aiData.summary}
              </p>

              {aiData.flags.length > 0 && (
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  {aiData.flags.map((flag, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-[#f8fafc] border border-slate-200 text-xs"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-[#1e4c77] text-[11px] font-roboto">
                          {flag.rule_id || "Regulatory Standard"}
                        </span>
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
                            flag.severity === "high"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          )}
                        >
                          {flag.severity}
                        </span>
                      </div>
                      <p className="italic text-slate-700 font-serif text-[11px] border-l-2 border-slate-300 pl-2 my-1">
                        &ldquo;{flag.passage}&rdquo;
                      </p>
                      <p className="text-slate-500 text-[11px] mt-1 font-sans">
                        {flag.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Document Properties */}
          <div className="rounded-xl border border-slate-200 p-4 bg-white text-xs">
            <h4 className="font-bold text-slate-900 mb-2.5">Document Details</h4>
            <div className="grid grid-cols-2 gap-2 text-slate-600 font-roboto">
              <div>
                <span className="text-slate-400 block text-[10px]">Type</span>
                <span className="font-medium text-slate-800">{doc.type}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">File Size</span>
                <span className="font-medium text-slate-800">{doc.file_size_mb} MB</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Submitted By</span>
                <span className="font-medium text-slate-800">{doc.advisor_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Audit Vault ID</span>
                <span className="font-medium text-slate-800">{doc.thread_id}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 border-t border-slate-200 bg-[#f8fafc] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => alert(`Downloading ${doc.title} from SEC secure vault.`)}
            className="flex-1 h-10 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download File</span>
          </button>

          {doc.status === "needs_revision" ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onReviseClick(doc);
              }}
              className="flex-1 h-10 rounded-xl bg-[#1e4c77] hover:bg-[#163e63] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Revise & Resubmit</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-5 h-10 rounded-xl bg-[#1e4c77] hover:bg-[#163e63] text-white text-xs font-semibold transition-all shadow-xs cursor-pointer"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
