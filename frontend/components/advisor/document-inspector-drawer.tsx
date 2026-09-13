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
  History,
  ListChecks,
} from "lucide-react";
import { ComplianceDocument } from "@/types/compliance";
import { MOCK_AI_ANALYSIS } from "@/lib/mock-data";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { documentsApi, type ThreadEntry, type AuditEvent } from "@/lib/documents-api";
import { ApiError } from "@/lib/api-client";

interface DocumentInspectorDrawerProps {
  document: ComplianceDocument | null;
  onClose: () => void;
  onReviseClick: (doc: ComplianceDocument) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const STATUS_LABELS: Record<string, string> = {
  pending_review: "Pending Review",
  approved: "Approved",
  rejected: "Rejected",
  needs_revision: "Needs Revision",
};

export function DocumentInspectorDrawer({
  document: doc,
  onClose,
  onReviseClick,
}: DocumentInspectorDrawerProps) {
  const [thread, setThread] = React.useState<ThreadEntry[] | null>(null);
  const [audit, setAudit] = React.useState<AuditEvent[] | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = React.useState(false);
  const [historyError, setHistoryError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!doc) {
      setThread(null);
      setAudit(null);
      return;
    }
    setIsLoadingHistory(true);
    setHistoryError(null);
    Promise.all([documentsApi.getThread(doc.id), documentsApi.getAudit(doc.id)])
      .then(([threadData, auditData]) => {
        setThread(threadData);
        setAudit(auditData);
      })
      .catch((err) => {
        setHistoryError(err instanceof ApiError ? err.message : "Unable to load history.");
      })
      .finally(() => setIsLoadingHistory(false));
  }, [doc]);

  if (!doc) return null;

  const aiData = MOCK_AI_ANALYSIS[doc.id];
  const currentEntry = thread?.find((t) => t.document_id === doc.id);

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
                {doc.id.slice(0, 8)} · v{doc.version}
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
          {historyError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              {historyError}
            </div>
          )}

          {/* TA-64: Decision, officer comment, and decision time -- OR
              a clear "still pending" state, never nothing. */}
          {isLoadingHistory ? (
            <div className="rounded-xl border border-slate-200 p-4 bg-white text-xs text-slate-400">
              Loading decision history...
            </div>
          ) : currentEntry?.review ? (
            <div
              className={cn(
                "rounded-xl p-4 border",
                currentEntry.review.status === "needs_revision" || currentEntry.review.status === "rejected"
                  ? "bg-amber-50/70 border-amber-200"
                  : "bg-emerald-50/60 border-emerald-200"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white",
                    currentEntry.review.status === "needs_revision" || currentEntry.review.status === "rejected"
                      ? "bg-amber-600" : "bg-emerald-600"
                  )}
                >
                  {currentEntry.review.status === "approved" ? "✓" : "!"}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    {STATUS_LABELS[currentEntry.review.status] ?? currentEntry.review.status}
                  </p>
                  <p className="text-[10px] text-slate-500 font-roboto">
                    Decided {formatDate(currentEntry.review.decided_at)}
                  </p>
                </div>
              </div>
              {currentEntry.review.comment && (
                <p className="text-xs text-slate-800 leading-relaxed font-sans bg-white/80 p-3 rounded-lg border border-slate-200">
                  &ldquo;{currentEntry.review.comment}&rdquo;
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 flex items-center gap-2.5">
              <Clock className="h-4 w-4 text-[#1e4c77] shrink-0" />
              <p className="text-xs text-[#1e4c77] font-medium">
                Still pending review -- no decision has been made yet.
              </p>
            </div>
          )}

          {/* TA-64: Every revision in the thread, in order, with its own outcome */}
          {thread && thread.length > 0 && (
            <div className="rounded-xl border border-slate-200 p-4 bg-white">
              <div className="flex items-center gap-1.5 mb-3">
                <History className="h-4 w-4 text-[#2575bc]" />
                <h4 className="text-xs font-bold text-slate-900">Revision History</h4>
                <span className="text-[10px] text-slate-400 font-roboto">
                  ({thread.length} version{thread.length !== 1 ? "s" : ""})
                </span>
              </div>
              <div className="space-y-2">
                {thread.map((entry, idx) => (
                  <div
                    key={entry.document_id}
                    className={cn(
                      "flex items-center justify-between rounded-lg p-2.5 border text-xs",
                      entry.document_id === doc.id
                        ? "border-[#2575bc] bg-blue-50/40"
                        : "border-slate-100 bg-[#f8fafc]"
                    )}
                  >
                    <div>
                      <span className="font-semibold text-slate-800">v{idx + 1}</span>
                      <span className="text-slate-400 ml-2 font-roboto">
                        {formatDate(entry.uploaded_at)}
                      </span>
                    </div>
                    <StatusBadge status={entry.review?.status ?? "pending_review"} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TA-64: Readable audit trail for the whole thread */}
          {audit && audit.length > 0 && (
            <div className="rounded-xl border border-slate-200 p-4 bg-white">
              <div className="flex items-center gap-1.5 mb-3">
                <ListChecks className="h-4 w-4 text-[#2575bc]" />
                <h4 className="text-xs font-bold text-slate-900">Audit Trail</h4>
              </div>
              <div className="space-y-1.5">
                {audit.map((event) => (
                  <div key={event.id} className="flex items-center justify-between text-[11px] py-1 border-b border-slate-50 last:border-0">
                    <span className="text-slate-700 capitalize">{event.action.replace(/_/g, " ")}</span>
                    <span className="text-slate-400 font-roboto">{formatDate(event.timestamp)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Pre-Screen Analysis Summary (still mock -- separate ticket) */}
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
                <span className="text-slate-400 block text-[10px]">Submitted By</span>
                <span className="font-medium text-slate-800">{doc.advisor_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Thread ID</span>
                <span className="font-medium text-slate-800">{doc.thread_id.slice(0, 8)}</span>
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
