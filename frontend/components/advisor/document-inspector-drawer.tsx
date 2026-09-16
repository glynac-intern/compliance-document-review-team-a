"use client";

import * as React from "react";
import {
  X,
  Clock,
  Download,
  Edit3,
  Loader2,
} from "lucide-react";
import { ComplianceDocument } from "@/types/compliance";
import { MOCK_AI_ANALYSIS } from "@/lib/mock-data";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { documentsApi, type ThreadEntry, type AuditEvent, type BackendAnalysis } from "@/lib/documents-api";
import { ApiError } from "@/lib/api-client";

interface DocumentInspectorDrawerProps {
  document: ComplianceDocument | null;
  // True if this document has already been superseded by its own
  // revision -- its needs_revision status is a historical record at
  // that point, not something still actionable.
  isSuperseded?: boolean;
  onClose: () => void;
  onReviseClick: (doc: ComplianceDocument) => void;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function DocumentInspectorDrawer({
  document: doc,
  isSuperseded = false,
  onClose,
  onReviseClick,
}: DocumentInspectorDrawerProps) {
  const [thread, setThread] = React.useState<ThreadEntry[] | null>(null);
  const [audit, setAudit] = React.useState<AuditEvent[] | null>(null);
  const [analysis, setAnalysis] = React.useState<BackendAnalysis | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = React.useState(false);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = React.useState(false);
  const [isRetryingAnalysis, setIsRetryingAnalysis] = React.useState(false);
  const [historyError, setHistoryError] = React.useState<string | null>(null);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [downloadError, setDownloadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!doc) {
      setThread(null);
      setAudit(null);
      setAnalysis(null);
      return;
    }
    setIsLoadingHistory(true);
    setIsLoadingAnalysis(true);
    setHistoryError(null);
    setDownloadError(null);

    // Fire-and-forget: this is what actually records the advisor's
    // 'viewed' audit event server-side (see documentsApi.get's comment).
    // Neither the thread nor audit endpoints do this, so opening this
    // drawer previously never recorded a view at all.
    documentsApi.get(doc.id).catch(() => {
      // Non-critical -- the drawer already has doc's data via props.
    });

    Promise.all([documentsApi.getThread(doc.id), documentsApi.getAudit(doc.id)])
      .then(([threadData, auditData]) => {
        setThread(threadData);
        setAudit(auditData);
      })
      .catch((err) => {
        setHistoryError(err instanceof ApiError ? err.message : "Unable to load history.");
      })
      .finally(() => setIsLoadingHistory(false));

    documentsApi
      .getAnalysis(doc.id)
      .then((data) => setAnalysis(data))
      .catch(() => {
        // Handled gracefully; fallback to mock data if backend not present
      })
      .finally(() => setIsLoadingAnalysis(false));
  }, [doc]);

  const handleRetryAnalysis = async () => {
    if (!doc) return;
    setIsRetryingAnalysis(true);
    try {
      const fresh = await documentsApi.retryAnalysis(doc.id);
      setAnalysis(fresh);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to retry analysis.");
    } finally {
      setIsRetryingAnalysis(false);
    }
  };

  const handleDownload = async () => {
    if (!doc) return;
    setIsDownloading(true);
    setDownloadError(null);
    try {
      await documentsApi.downloadFile(doc.id, doc.title);
    } catch (err) {
      setDownloadError(err instanceof ApiError ? err.message : "Failed to download file.");
    } finally {
      setIsDownloading(false);
    }
  };

  const fallbackAiData = doc ? MOCK_AI_ANALYSIS[doc.id] : undefined;
  const currentEntry = thread?.find((t) => t.document_id === doc?.id);

  const findings = React.useMemo(() => {
    if (analysis && analysis.flags && analysis.flags.length > 0) {
      return analysis.flags.map((f) => ({
        rule: f.matched_rule?.text || f.matched_rule?.type || "Regulatory Standard",
        severity: f.severity || "medium",
        passage: f.passage_excerpt || "",
        explanation: f.explanation || "",
      }));
    }
    if (fallbackAiData && fallbackAiData.flags && fallbackAiData.flags.length > 0) {
      return fallbackAiData.flags.map((f) => ({
        rule: f.rule_id || "Regulatory Standard",
        severity: f.severity || "medium",
        passage: f.passage || "",
        explanation: f.explanation || "",
      }));
    }
    return [];
  }, [analysis, fallbackAiData]);

  if (!doc) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs font-inter select-none animate-in fade-in duration-200">
      {/* Click outside to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer Body */}
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 overflow-hidden border-l border-slate-200 animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-start justify-between bg-white font-inter">
          <div className="min-w-0 flex-1 pr-4">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <StatusBadge status={doc.status} />
              <span className="text-xs text-slate-400 font-numbers font-normal">
                {doc.id} · v{doc.version}
              </span>
            </div>
            <h2 className="text-base font-medium text-slate-900 leading-snug break-words font-inter">
              {doc.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close inspector"
            className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 font-inter">
          {historyError && (
            <div className="border border-rose-200 bg-rose-50/50 p-2.5 rounded text-xs text-rose-700 font-inter">
              {historyError}
            </div>
          )}

          {/* Section 1: Document Details in a Clean Table */}
          <div className="space-y-1.5 font-inter">
            <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Document Information
            </h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs text-left border-collapse font-inter">
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr>
                    <td className="py-2 px-3 text-slate-500 font-medium w-32 bg-slate-50/60">Category / Type</td>
                    <td className="py-2 px-3 text-slate-800 font-medium">{doc.type}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-slate-500 font-medium bg-slate-50/60">Submitted By</td>
                    <td className="py-2 px-3 text-slate-800">{doc.advisor_name}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-slate-500 font-medium bg-slate-50/60">Document ID</td>
                    <td className="py-2 px-3 font-numbers text-slate-700">{doc.id}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-slate-500 font-medium bg-slate-50/60">Thread ID</td>
                    <td className="py-2 px-3 font-numbers text-slate-700">{doc.thread_id}</td>
                  </tr>
                  {doc.uploaded_at && (
                    <tr>
                      <td className="py-2 px-3 text-slate-500 font-medium bg-slate-50/60">Submitted Date</td>
                      <td className="py-2 px-3 font-numbers text-slate-700">{formatDate(doc.uploaded_at)}</td>
                    </tr>
                  )}
                  {doc.file_size_mb && (
                    <tr>
                      <td className="py-2 px-3 text-slate-500 font-medium bg-slate-50/60">File Size</td>
                      <td className="py-2 px-3 font-numbers text-slate-700">{doc.file_size_mb} MB</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Officer Decision & Comments in a Table */}
          {isLoadingHistory ? (
            <div className="py-3 text-xs text-slate-400 font-inter">
              Loading review status...
            </div>
          ) : currentEntry?.review ? (
            <div className="space-y-1.5 font-inter">
              <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Review Decision
              </h3>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left border-collapse font-inter">
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr>
                      <td className="py-2 px-3 text-slate-500 font-medium w-32 bg-slate-50/60">Outcome</td>
                      <td className="py-2 px-3 font-medium">
                        <StatusBadge status={currentEntry.review.status} />
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-slate-500 font-medium bg-slate-50/60">Decision Date</td>
                      <td className="py-2 px-3 font-numbers text-slate-700">
                        {formatDate(currentEntry.review.decided_at)}
                      </td>
                    </tr>
                    {currentEntry.review.comment && (
                      <tr>
                        <td className="py-2 px-3 text-slate-500 font-medium bg-slate-50/60 align-top">Officer Comment</td>
                        <td className="py-2 px-3 text-slate-800 leading-relaxed font-normal">
                          {currentEntry.review.comment}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-2 text-xs text-slate-500 font-inter flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-[#1e4c77] shrink-0" />
              <span>Pending review — awaiting compliance officer assessment.</span>
            </div>
          )}

          {/* Section 3: Compliance Citations in a Professional Table */}
          {isLoadingAnalysis ? (
            <div className="py-3 flex items-center gap-2 text-xs text-slate-500 font-inter">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#1e4c77]" />
              <span>Checking compliance pre-screening...</span>
            </div>
          ) : analysis?.status === "failed" ? (
            <div className="space-y-1.5 font-inter">
              <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Pre-Screen Status
              </h3>
              <div className="border border-slate-200 rounded-lg p-3 text-xs text-[#991b1b] flex items-center justify-between gap-3">
                <span>Analysis failed: {analysis.error_message || "An unexpected error occurred."}</span>
                <button
                  type="button"
                  onClick={handleRetryAnalysis}
                  disabled={isRetryingAnalysis}
                  className="px-2.5 py-1 rounded bg-[#991b1b] text-white text-[11px] font-medium cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {isRetryingAnalysis ? "Retrying..." : "Retry"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5 font-inter">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Rule Citations &amp; Findings ({findings.length})
                </h3>
              </div>

              {findings.length === 0 ? (
                <div className="border border-slate-200 rounded-lg p-3 text-xs text-slate-600 font-inter">
                  No compliance violations detected under SEC / FINRA rules.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse font-inter min-w-[420px]">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium text-[11px]">
                      <tr>
                        <th className="py-2 px-3 font-medium w-36">Rule / Standard</th>
                        <th className="py-2 px-3 font-medium w-20">Severity</th>
                        <th className="py-2 px-3 font-medium">Flagged Text &amp; Requirement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-700">
                      {findings.map((flag, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 align-top font-medium text-slate-900">
                            {flag.rule}
                          </td>
                          <td className="py-2.5 px-3 align-top">
                            <span
                              className={cn(
                                "font-medium text-[11px] uppercase tracking-wide",
                                flag.severity.toLowerCase() === "high" && "text-[#991b1b]",
                                flag.severity.toLowerCase() === "medium" && "text-[#92400e]",
                                flag.severity.toLowerCase() === "low" && "text-slate-600"
                              )}
                            >
                              {flag.severity}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 align-top space-y-1.5">
                            {flag.passage && (
                              <p className="font-mono text-[11px] text-slate-800 bg-slate-50 border border-slate-200/80 px-2 py-1 rounded">
                                &ldquo;{flag.passage}&rdquo;
                              </p>
                            )}
                            <p className="text-[11.5px] text-slate-600 leading-relaxed font-normal">
                              {flag.explanation}
                            </p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Section 4: Revision History in a Clean Table */}
          {thread && thread.length > 0 && (
            <div className="space-y-1.5 font-inter">
              <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Revision History ({thread.length})
              </h3>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left border-collapse font-inter">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium text-[11px]">
                    <tr>
                      <th className="py-2 px-3 font-medium">Version</th>
                      <th className="py-2 px-3 font-medium">Date</th>
                      <th className="py-2 px-3 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {thread.map((entry, idx) => (
                      <tr
                        key={entry.document_id}
                        className={cn(
                          entry.document_id === doc.id ? "bg-slate-50 font-medium" : "hover:bg-slate-50/40"
                        )}
                      >
                        <td className="py-2 px-3 text-slate-800">
                          v{idx + 1}
                          {entry.document_id === doc.id && (
                            <span className="ml-1 text-[10px] text-slate-400 font-normal">(current)</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-500 font-numbers">
                          {formatDate(entry.uploaded_at)}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <StatusBadge status={entry.review?.status ?? "pending_review"} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 5: Audit Trail in a Clean Table */}
          {audit && audit.length > 0 && (
            <div className="space-y-1.5 font-inter">
              <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Audit Trail ({audit.length})
              </h3>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left border-collapse font-inter">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium text-[11px]">
                    <tr>
                      <th className="py-2 px-3 font-medium">Action</th>
                      <th className="py-2 px-3 font-medium text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {audit.map((event) => (
                      <tr key={event.id} className="hover:bg-slate-50/40">
                        <td className="py-2 px-3 text-slate-700 capitalize">
                          {event.action.replace(/_/g, " ")}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-400 font-numbers text-[11px]">
                          {formatDate(event.timestamp)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        {downloadError && (
          <div className="px-4 py-2 bg-rose-50 text-rose-700 text-xs border-t border-rose-200 font-inter">
            {downloadError}
          </div>
        )}
        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between gap-3 font-inter">
          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex-1 h-10 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50 font-inter"
          >
            {isDownloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#1e4c77]" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            <span>{isDownloading ? "Downloading..." : "Download File"}</span>
          </button>

          {doc.status === "needs_revision" && !isSuperseded ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onReviseClick(doc);
              }}
              className="flex-1 h-10 rounded-xl bg-[#1e4c77] hover:bg-[#163e63] text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer font-inter"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Revise &amp; Resubmit</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-5 h-10 rounded-xl bg-[#1e4c77] hover:bg-[#163e63] text-white text-xs font-medium transition-all shadow-xs cursor-pointer font-inter"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
