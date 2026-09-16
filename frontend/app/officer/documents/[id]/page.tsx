"use client";

/**
 * Officer Document Review Workspace — Next-Gen Split-screen layout.
 *
 * Left panel:  High-fidelity Document Preview (PDF via native blob URL iframe,
 *              DOCX/XLSX download prompts), switchable to submission metadata,
 *              revision thread history, and audit ledger.
 * Right panel: Factual AI Compliance Assist with clean state for zero flags,
 *              rule citations, precedents, degraded 503 error handling with retry,
 *              and authoritative regulatory determination workflow.
 */

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Loader2,
  FileText,
  User,
  Calendar,
  Hash,
  Layers,
  Clock,
  Eye,
  ListFilter,
  CheckCircle2,
  FileWarning,
  Check,
  X,
  RotateCcw,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRequireAuth } from "@/lib/use-require-auth";
import { apiFetch, fetchFileBlob, ApiError } from "@/lib/api-client";
import {
  documentsApi,
  type BackendDocument,
  type ThreadEntry,
  type AuditEvent,
} from "@/lib/documents-api";
import { reviewsApi, type DecisionStatus } from "@/lib/reviews-api";
import { StatusBadge } from "@/components/ui/status-badge";
import { FileTypeIcon } from "@/components/ui/file-type-icon";
import { MOCK_QUEUE_DOCUMENTS, MOCK_COMPLETED_REVIEWS } from "@/lib/mock-officer-data";
import { AiAssistPanel } from "@/components/officer/ai-assist-panel";

interface MatchedRule {
  id: string;
  text: string;
  type: string;
}

interface AnalysisFlag {
  passage_excerpt: string;
  matched_rule: MatchedRule | null;
  explanation: string;
  severity: string;
}

interface Precedent {
  document_id: string;
  masked_text: string;
  decision: string;
  comment: string | null;
}

interface AnalysisResponse {
  status: "not_started" | "in_progress" | "succeeded" | "failed";
  error_message: string | null;
  summary: string | null;
  flags: AnalysisFlag[];
  precedents: Precedent[];
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OfficerDocumentReviewPage() {
  const { isReady } = useRequireAuth("officer");
  const router = useRouter();
  const params = useParams();
  const documentId = params.id as string;

  // Document state
  const [doc, setDoc] = React.useState<BackendDocument | null>(null);
  const [docError, setDocError] = React.useState<string | null>(null);
  const [isDocLoading, setIsDocLoading] = React.useState(true);
  const [fileBlobUrl, setFileBlobUrl] = React.useState<string | null>(null);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [isDownloading, setIsDownloading] = React.useState(false);

  // Tab state for left panel: "preview" vs "details"
  const [leftTab, setLeftTab] = React.useState<"preview" | "details">("preview");

  // Thread / audit state
  const [threadEntries, setThreadEntries] = React.useState<ThreadEntry[]>([]);
  const [auditEvents, setAuditEvents] = React.useState<AuditEvent[]>([]);

  // AI Analysis state (TA-68 & TA-70)
  const [analysis, setAnalysis] = React.useState<AnalysisResponse | null>(null);
  const [isRetrying, setIsRetrying] = React.useState(false);

  // Decision state (TA-69)
  const [recordedReview, setRecordedReview] = React.useState<ThreadEntry["review"] | null>(null);
  const [comment, setComment] = React.useState("");
  const [isSubmittingDecision, setIsSubmittingDecision] = React.useState(false);
  const [decisionError, setDecisionError] = React.useState<string | null>(null);
  const [justDecided, setJustDecided] = React.useState(false);

  const mockDoc = React.useMemo(
    () =>
      MOCK_QUEUE_DOCUMENTS.find((d) => d.id === documentId) ||
      MOCK_COMPLETED_REVIEWS.find((d) => d.id === documentId),
    [documentId]
  );
  const mockQueueDoc = React.useMemo(
    () => (mockDoc && "version" in mockDoc ? mockDoc : null),
    [mockDoc]
  );

  // TA-70: load analysis with 503 degraded error handling
  const loadAnalysis = React.useCallback(() => {
    apiFetch<AnalysisResponse>(`/documents/${documentId}/analysis`)
      .then(setAnalysis)
      .catch((err) => {
        setAnalysis({
          status: "failed",
          error_message: err instanceof ApiError ? err.message : "Analysis failed unexpectedly.",
          summary: null,
          flags: [],
          precedents: [],
        });
      });
  }, [documentId]);

  const handleRetryAnalysis = async () => {
    setIsRetrying(true);
    try {
      const result = await apiFetch<AnalysisResponse>(`/documents/${documentId}/analysis/retry`, {
        method: "POST",
      });
      setAnalysis(result);
    } catch (err) {
      setAnalysis({
        status: "failed",
        error_message: err instanceof ApiError ? err.message : "Retry failed unexpectedly.",
        summary: null,
        flags: [],
        precedents: [],
      });
    } finally {
      setIsRetrying(false);
    }
  };

  // Load document & file
  React.useEffect(() => {
    if (!isReady) return;

    // Opening this page calls GET /review/documents/{id}, which records a view in audit trail (TA-28)
    apiFetch<BackendDocument>(`/review/documents/${documentId}`)
      .then((d) => {
        setDoc(d);
        setDocError(null);
        return fetchFileBlob(`/documents/${documentId}/file`);
      })
      .then((blob) => {
        setFileBlobUrl(URL.createObjectURL(blob));
      })
      .catch((err) => {
        if (mockDoc) {
          setDoc({
            id: mockDoc.id,
            advisor_id: mockDoc.advisor_id,
            status: (mockDoc.status === "in_review" || mockDoc.status === "pending"
              ? "pending_review"
              : mockDoc.status) as BackendDocument["status"],
            original_filename: mockDoc.title,
            type: (mockDoc.title.split(".").pop()?.toLowerCase() ?? "pdf") as BackendDocument["type"],
            uploaded_at: mockDoc.uploaded_at,
            thread_id: mockQueueDoc?.thread_id ?? `THR-${mockDoc.id.replace("DOC-2026-", "")}`,
            replaces_document_id: mockQueueDoc?.replaces_document_id ?? null,
            revision_notes: mockQueueDoc?.revision_notes ?? null,
          });
        } else {
          setDocError(err instanceof ApiError ? err.message : "Unable to load this document.");
        }
        setFileError(err instanceof ApiError ? err.message : "Unable to load the file preview.");
      })
      .finally(() => {
        setIsDocLoading(false);
      });

    loadAnalysis();

    documentsApi
      .getThread(documentId)
      .then((thread) => {
        setThreadEntries(thread);
        const entry = thread.find((t) => t.document_id === documentId);
        setRecordedReview(entry?.review ?? null);
      })
      .catch(() => setRecordedReview(null));

    documentsApi
      .getAudit(documentId)
      .then(setAuditEvents)
      .catch(() => {});
  }, [isReady, documentId, loadAnalysis, mockDoc]);

  // Clean up blob URL
  React.useEffect(() => {
    return () => {
      if (fileBlobUrl) URL.revokeObjectURL(fileBlobUrl);
    };
  }, [fileBlobUrl]);

  // Download file handler
  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const blob = await fetchFileBlob(`/documents/${documentId}/file`);
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = doc?.original_filename ?? `document-${documentId}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback
      if (doc) {
        await documentsApi.downloadFile(doc.id, doc.original_filename || `document-${doc.id}`).catch(() => {});
      }
    } finally {
      setIsDownloading(false);
    }
  };

  // Submit decision handler (TA-69)
  const handleDecision = async (status: DecisionStatus) => {
    setDecisionError(null);
    setIsSubmittingDecision(true);
    try {
      const result = await reviewsApi.submitDecision(documentId, status, comment);
      setRecordedReview({
        status: result.status,
        comment: result.comment,
        decided_at: result.decided_at,
      });
      setJustDecided(true);
      // Confirm server's real persisted status
      const updated = await apiFetch<BackendDocument>(`/review/documents/${documentId}`);
      setDoc(updated);
    } catch (err) {
      setDecisionError(err instanceof ApiError ? err.message : "Failed to record decision.");
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  if (!isReady) return null;

  const isPdf = doc?.type === "pdf";
  const displayTitle = doc?.original_filename ?? mockDoc?.title ?? `Document ${documentId.slice(0, 8)}`;
  const displayAdvisor = mockDoc?.advisor_name ?? doc?.advisor_id ?? "Unknown";
  const displayStatus = doc?.status ?? "pending_review";
  const displayType = doc?.type?.toUpperCase() ?? mockDoc?.type?.toUpperCase() ?? "—";
  const displaySize = mockDoc?.file_size_mb ? `${mockDoc.file_size_mb} MB` : "—";
  const displayVersion = mockQueueDoc?.version ?? (threadEntries.length > 0 ? threadEntries.length : 1);
  const displayUploadedAt = doc?.uploaded_at ?? mockDoc?.uploaded_at ?? "";

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-inter">
      {/* ===== TOP NAVIGATION BAR ===== */}
      <header className="sticky top-0 z-30 h-14 border-b border-slate-200/90 bg-white/95 backdrop-blur-md flex items-center justify-between px-5 shrink-0">
        <button
          type="button"
          onClick={() => router.push("/officer")}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer font-inter"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Review Queue</span>
        </button>

        <div className="flex items-center gap-3">
          <StatusBadge status={displayStatus} />
          <span className="text-[13px] font-semibold text-slate-800 font-inter max-w-[320px] truncate hidden sm:block">
            {displayTitle}
          </span>
          <span className="text-[11px] text-slate-400 font-mono tabular-nums hidden md:block">
            {documentId}
          </span>
        </div>

        <button
          type="button"
          onClick={handleDownload}
          disabled={isDownloading || !doc}
          className="h-8 px-3 rounded-lg border border-slate-200/90 bg-white hover:bg-slate-50 text-[11px] font-medium text-slate-700 hover:text-[#1e4c77] hover:border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 font-inter shadow-2xs"
        >
          {isDownloading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#1e4c77]" />
          ) : (
            <Download className="h-3.5 w-3.5 text-[#1e4c77]" />
          )}
          <span className="hidden sm:inline">Download</span>
        </button>
      </header>

      {/* Decision Success Banner */}
      {justDecided && (
        <div className="px-5 py-2 bg-emerald-50 border-b border-emerald-200 text-[12px] text-emerald-800 font-inter flex items-center justify-between animate-in fade-in shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="font-medium">Decision recorded.</span>
          </div>
          <button
            type="button"
            onClick={() => setJustDecided(false)}
            className="text-[11px] text-emerald-700 underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Banner */}
      {docError && (
        <div className="px-5 py-2 bg-rose-50 border-b border-rose-200 text-[12px] text-rose-700 font-inter shrink-0">
          <span>{docError}</span>
        </div>
      )}

      {/* ===== MAIN CONTENT — SPLIT SCREEN ===== */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* ===== LEFT PANEL: Document Workspace ===== */}
        <div className="flex-1 min-w-0 lg:w-[58%] border-r border-slate-200 flex flex-col bg-white overflow-hidden">
          {/* Sub-Header: View Mode Tabs */}
          <div className="h-10 border-b border-slate-200 px-4 flex items-center justify-between bg-slate-50/70 shrink-0">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setLeftTab("preview")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer font-inter",
                  leftTab === "preview"
                    ? "bg-white text-[#1e4c77] shadow-2xs border border-slate-200 font-semibold"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                <Eye className={cn("h-3.5 w-3.5", leftTab === "preview" ? "text-[#1e4c77]" : "text-slate-500")} />
                <span>Document Preview</span>
              </button>
              <button
                type="button"
                onClick={() => setLeftTab("details")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer font-inter",
                  leftTab === "details"
                    ? "bg-white text-[#1e4c77] shadow-2xs border border-slate-200 font-semibold"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                <ListFilter className={cn("h-3.5 w-3.5", leftTab === "details" ? "text-[#1e4c77]" : "text-slate-500")} />
                <span>Document Details</span>
              </button>
            </div>
          </div>

          {/* Left Panel Body */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {isDocLoading ? (
              <div className="p-8 space-y-4 animate-pulse">
                <div className="h-8 w-64 bg-slate-100 rounded" />
                <div className="h-4 w-48 bg-slate-50 rounded" />
                <div className="h-64 w-full bg-slate-100 rounded-lg mt-6" />
              </div>
            ) : leftTab === "preview" ? (
              /* REAL DOCUMENT PREVIEW (PDF in iframe, DOCX/XLSX download prompt) */
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Advisor Revision Note Callout */}
                {(doc?.revision_notes || mockQueueDoc?.revision_notes) && (
                  <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-start gap-3 text-xs shrink-0">
                    <MessageSquare className="h-4 w-4 text-[#1e4c77] shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-medium text-slate-800">
                        <span>Advisor Revision Note</span>
                        <span className="text-[11px] text-slate-400 font-normal">· {displayAdvisor}</span>
                      </div>
                      <p className="text-slate-700 mt-0.5 leading-relaxed">
                        {doc?.revision_notes ?? mockQueueDoc?.revision_notes}
                      </p>
                    </div>
                  </div>
                )}

                {isPdf && fileBlobUrl ? (
                  <iframe src={fileBlobUrl} className="flex-1 w-full h-full border-0" title="Document preview" />
                ) : fileError ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
                    <FileWarning className="h-8 w-8 text-slate-300" />
                    <p className="text-xs text-slate-500">{fileError}</p>
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[#1e4c77] rounded-lg px-3 py-2 cursor-pointer hover:bg-[#163c60]"
                    >
                      <Download className="h-3.5 w-3.5" /> Download to view
                    </button>
                  </div>
                ) : doc && !isPdf ? (
                  /* DOCX/XLSX: clear download action instead of failing silently (TA-67) */
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
                    <FileWarning className="h-8 w-8 text-slate-300" />
                    <p className="text-xs text-slate-500">
                      {doc.type.toUpperCase()} files can&apos;t be previewed inline. Download to view the original.
                    </p>
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[#1e4c77] rounded-lg px-3 py-2 cursor-pointer hover:bg-[#163c60]"
                    >
                      <Download className="h-3.5 w-3.5" /> Download
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
                    Loading document...
                  </div>
                )}
              </div>
            ) : (
              /* SUBMISSION DETAILS & AUDIT LOG VIEW */
              <div className="h-full overflow-y-auto p-6 sm:p-8 space-y-6 font-inter">
                <div className="flex items-start gap-4">
                  <FileTypeIcon filename={displayTitle} type={doc?.type ?? "pdf"} size="lg" />
                  <div>
                    <h1 className="text-base font-bold text-slate-900 font-inter">
                      {displayTitle}
                    </h1>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">{documentId}</p>
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-100">
                  <div className="flex items-start gap-2.5">
                    <User className="h-3.5 w-3.5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Advisor</p>
                      <p className="text-[13px] font-medium text-slate-800">{displayAdvisor}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <FileText className="h-3.5 w-3.5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Document Type</p>
                      <p className="text-[13px] font-medium text-slate-800">{displayType}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Submitted</p>
                      <p className="text-[13px] font-medium text-slate-800 tabular-nums">
                        {displayUploadedAt ? formatDateTime(displayUploadedAt) : "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Hash className="h-3.5 w-3.5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">File Size</p>
                      <p className="text-[13px] font-medium text-slate-800 tabular-nums">
                        {displaySize}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Layers className="h-3.5 w-3.5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Version</p>
                      <p className="text-[13px] font-medium text-slate-800 tabular-nums">
                        v{displayVersion}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Thread ID</p>
                      <p className="text-[13px] font-medium text-slate-800 tabular-nums">
                        {doc?.thread_id ?? mockQueueDoc?.thread_id ?? "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Advisor Revision Note in Details */}
                {(doc?.revision_notes || mockQueueDoc?.revision_notes) && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 font-inter">
                    <div className="flex items-center gap-2 mb-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-[#1e4c77]" />
                      <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                        Advisor Revision Note
                      </h3>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {doc?.revision_notes ?? mockQueueDoc?.revision_notes}
                    </p>
                  </div>
                )}

                {/* Revision Thread */}
                {threadEntries.length > 1 && (
                  <div>
                    <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2">
                      Revision History
                    </h3>
                    <div className="space-y-2">
                      {threadEntries.map((entry, i) => (
                        <div
                          key={entry.document_id}
                          className="rounded-xl border border-slate-200 p-3 text-[12px] space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-700">
                              v{threadEntries.length - i}
                            </span>
                            <StatusBadge status={entry.status} />
                          </div>
                          {entry.revision_notes && (
                            <div className="text-[11px] text-slate-700 bg-slate-50 rounded-lg p-2 border border-slate-100">
                              <span className="font-semibold text-slate-900 mr-1">Advisor Note:</span>
                              <span>{entry.revision_notes}</span>
                            </div>
                          )}
                          {entry.review?.comment && (
                            <p className="text-[11px] text-slate-600 mt-1">
                              <span className="font-semibold text-slate-700 mr-1">Officer Note:</span>
                              {entry.review.comment}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Audit Trail */}
                {auditEvents.length > 0 && (
                  <div>
                    <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2">
                      Audit Ledger
                    </h3>
                    <div className="space-y-1 divide-y divide-slate-100 border border-slate-200 rounded-xl p-3 bg-white">
                      {auditEvents.map((event) => (
                        <div
                          key={event.id}
                          className="flex items-center justify-between py-1.5 text-[11px]"
                        >
                          <span className="text-slate-700 font-medium">{event.action}</span>
                          <span className="text-slate-400 tabular-nums">
                            {formatDateTime(event.timestamp)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ===== RIGHT PANEL: AI CHAT + DECISION ACTION ===== */}
        <div className="w-full lg:w-[42%] shrink-0 flex flex-col bg-white overflow-hidden min-h-0">
          {/* Conversational AI Chat Window */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <AiAssistPanel
              documentId={documentId}
              analysis={analysis ? {
                id: "",
                document_id: documentId,
                status: analysis.status,
                error_message: analysis.error_message,
                summary: analysis.summary,
                generated_at: null,
                flags: analysis.flags.map((f) => ({
                  id: "",
                  passage_excerpt: f.passage_excerpt,
                  matched_rule: f.matched_rule,
                  explanation: f.explanation,
                  severity: f.severity,
                })),
                precedents: analysis.precedents,
              } : undefined}
              isLoading={!analysis}
              errorMessage={analysis?.status === "failed" ? analysis.error_message : null}
              onRetry={handleRetryAnalysis}
              isRetrying={isRetrying}
              onInsertComment={(text) => setComment(text)}
            />
          </div>

          {/* ===== TA-69: DECISION WORKFLOW AREA ===== */}
          <div className="border-t border-slate-200 bg-slate-50/70 p-4 shrink-0 font-inter">
            {doc?.status !== "pending_review" || recordedReview ? (
              /* Recorded Decision view once document is no longer pending */
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-slate-800">
                  Recorded decision:{" "}
                  <span className="uppercase font-bold text-[#1e4c77]">
                    {recordedReview?.status.replace(/_/g, " ") ?? doc?.status}
                  </span>
                </p>
                {recordedReview?.comment && (
                  <p className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 leading-relaxed">
                    &ldquo;{recordedReview.comment}&rdquo;
                  </p>
                )}
                {recordedReview?.decided_at && (
                  <p className="text-[11px] text-slate-400">
                    Decided at: {new Date(recordedReview.decided_at).toLocaleString()}
                  </p>
                )}
              </div>
            ) : (
              /* Decision Submission Form when pending review */
              <div className="space-y-2.5">
                {decisionError && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
                    {decisionError}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Comment -- this is what the advisor will read
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={2}
                    disabled={isSubmittingDecision}
                    placeholder="Explain the decision, or what needs to change..."
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#2575bc] resize-none disabled:opacity-60 shadow-2xs font-inter"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDecision("approved")}
                    disabled={isSubmittingDecision}
                    className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer transition-colors shadow-2xs font-inter"
                  >
                    <Check className="h-3.5 w-3.5" /> Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecision("needs_revision")}
                    disabled={isSubmittingDecision}
                    className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold disabled:opacity-50 cursor-pointer transition-colors shadow-2xs font-inter"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Revision
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecision("rejected")}
                    disabled={isSubmittingDecision}
                    className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer transition-colors shadow-2xs font-inter"
                  >
                    <X className="h-3.5 w-3.5" /> Reject
                  </button>
                </div>
                {isSubmittingDecision && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Recording decision...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
