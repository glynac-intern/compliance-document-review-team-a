"use client";

/**
 * Officer Document Review Workspace — Next-Gen Split-screen layout.
 *
 * Left panel:  High-fidelity Document Preview (PDF, DOCX, XLSX) with page controls,
 *              zoom, search, and interactive highlighted compliance flags, plus
 *              switchable submission metadata, thread history, and audit log.
 * Right panel: Gemini-style AI Compliance Intelligence window with animated gradient outline,
 *              interactive "Ask Gemini" prompt bar, and bespoke regulatory decision controls.
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRequireAuth } from "@/lib/use-require-auth";
import { apiFetch, ApiError } from "@/lib/api-client";
import {
  documentsApi,
  type BackendDocument,
  type BackendAnalysis,
  type ThreadEntry,
  type AuditEvent,
} from "@/lib/documents-api";
import { reviewsApi, type ReviewDecisionStatus } from "@/lib/reviews-api";
import { StatusBadge } from "@/components/ui/status-badge";
import { FileTypeIcon } from "@/components/ui/file-type-icon";
import { AiAssistPanel } from "@/components/officer/ai-assist-panel";
import { ReviewDecisionPanel, type ReviewDecision } from "@/components/officer/review-decision-panel";
import { DocumentPreviewViewer } from "@/components/officer/document-preview-viewer";
import {
  MOCK_QUEUE_DOCUMENTS,
  MOCK_AI_ANALYSIS,
  MOCK_PRECEDENTS,
} from "@/lib/mock-officer-data";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fileExtension(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return ext;
}

const MOCK_STATUS_MAP: Record<string, string> = {
  pending: "pending_review",
  in_review: "pending_review",
  approved: "approved",
  needs_revision: "needs_revision",
  rejected: "rejected",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OfficerDocumentReviewPage() {
  const { isReady } = useRequireAuth("officer");
  const router = useRouter();
  const params = useParams();
  const documentId = params.id as string;

  // Document state
  const [doc, setDoc] = React.useState<BackendDocument | null>(null);
  const [docError, setDocError] = React.useState<string | null>(null);
  const [isDocLoading, setIsDocLoading] = React.useState(true);

  // AI Analysis state
  const [analysis, setAnalysis] = React.useState<BackendAnalysis | null>(null);
  const [analysisError, setAnalysisError] = React.useState<string | null>(null);
  const [isAnalysisLoading, setIsAnalysisLoading] = React.useState(true);
  const [isRetrying, setIsRetrying] = React.useState(false);

  // Interactive Flag & Comment Linking
  const [activeFlagIndex, setActiveFlagIndex] = React.useState<number | null>(null);
  const [decisionComment, setDecisionComment] = React.useState<string>("");

  // Tab state for left panel: "preview" vs "details"
  const [leftTab, setLeftTab] = React.useState<"preview" | "details">("preview");

  // Thread / audit state
  const [threadEntries, setThreadEntries] = React.useState<ThreadEntry[]>([]);
  const [auditEvents, setAuditEvents] = React.useState<AuditEvent[]>([]);

  // Download state
  const [isDownloading, setIsDownloading] = React.useState(false);

  // Decision success state
  const [decisionSuccess, setDecisionSuccess] = React.useState<string | null>(null);

  // Mock data detection
  const [usingMock, setUsingMock] = React.useState(false);
  const mockDoc = React.useMemo(
    () => MOCK_QUEUE_DOCUMENTS.find((d) => d.id === documentId),
    [documentId]
  );

  // Load document
  React.useEffect(() => {
    if (!isReady) return;
    let ignore = false;

    apiFetch<BackendDocument>(`/review/documents/${documentId}`)
      .then((data) => {
        if (!ignore) {
          setDoc(data);
          setDocError(null);
          setUsingMock(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          if (mockDoc) {
            setDoc({
              id: mockDoc.id,
              advisor_id: mockDoc.advisor_id,
              status: (MOCK_STATUS_MAP[mockDoc.status] ?? "pending_review") as BackendDocument["status"],
              original_filename: mockDoc.title,
              type: fileExtension(mockDoc.title) as BackendDocument["type"],
              uploaded_at: mockDoc.uploaded_at,
              thread_id: mockDoc.thread_id,
              replaces_document_id: mockDoc.replaces_document_id,
            });
            setDocError(null);
            setUsingMock(true);
          } else {
            setDocError(err instanceof ApiError ? err.message : "Unable to load this document.");
          }
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsDocLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [isReady, documentId, mockDoc]);

  // Load AI analysis
  React.useEffect(() => {
    if (!isReady) return;
    let ignore = false;

    documentsApi
      .getAnalysis(documentId)
      .then((data) => {
        if (!ignore) {
          setAnalysis(data);
          setAnalysisError(null);
        }
      })
      .catch(() => {
        if (!ignore) {
          setAnalysisError(null);
          setUsingMock(true);
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsAnalysisLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [isReady, documentId]);

  // Load thread and audit
  React.useEffect(() => {
    if (!isReady) return;
    let ignore = false;

    documentsApi
      .getThread(documentId)
      .then((entries) => {
        if (!ignore) setThreadEntries(entries);
      })
      .catch(() => {});

    documentsApi
      .getAudit(documentId)
      .then((events) => {
        if (!ignore) setAuditEvents(events);
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, [isReady, documentId]);

  // Retry analysis
  const handleRetryAnalysis = React.useCallback(async () => {
    setIsRetrying(true);
    setAnalysisError(null);
    try {
      const data = await documentsApi.retryAnalysis(documentId);
      setAnalysis(data);
    } catch (err) {
      setAnalysisError(
        err instanceof ApiError ? err.message : "Retry failed. The AI service may be unavailable."
      );
    } finally {
      setIsRetrying(false);
    }
  }, [documentId]);

  // Download file
  const handleDownload = async () => {
    if (!doc) return;
    setIsDownloading(true);
    try {
      await documentsApi.downloadFile(doc.id, doc.original_filename || `document-${doc.id}`);
    } catch {
      // Handled
    } finally {
      setIsDownloading(false);
    }
  };

  // Submit decision
  const handleSubmitDecision = async (decision: ReviewDecision, comment: string) => {
    const payload = {
      status: decision as ReviewDecisionStatus,
      comment,
    };
    const result = await reviewsApi.submitDecision(documentId, payload);
    if (doc) {
      setDoc({ ...doc, status: result.status as BackendDocument["status"] });
    }
    setDecisionSuccess(
      decision === "approved"
        ? "Document approved and cleared for client distribution."
        : decision === "needs_revision"
        ? "Revision requested. Audit notes dispatched to advisor."
        : "Document prohibited. Regulatory refusal recorded."
    );
  };

  if (!isReady) return null;

  // Derived display values
  const displayTitle = doc?.original_filename ?? mockDoc?.title ?? `Document ${documentId.slice(0, 8)}`;
  const displayAdvisor = mockDoc?.advisor_name ?? doc?.advisor_id ?? "Unknown";
  const displayStatus = doc?.status ?? (mockDoc ? MOCK_STATUS_MAP[mockDoc.status] : "pending_review");
  const displayType = mockDoc?.type ?? doc?.type?.toUpperCase() ?? "—";
  const displaySize = mockDoc?.file_size_mb ? `${mockDoc.file_size_mb} MB` : "—";
  const displayVersion = mockDoc?.version ?? 1;
  const displayUploadedAt = doc?.uploaded_at ?? mockDoc?.uploaded_at ?? "";

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-inter select-none">
      {/* ===== TOP NAVIGATION BAR ===== */}
      <header className="sticky top-0 z-30 h-14 border-b border-slate-200/90 bg-white/95 backdrop-blur-md flex items-center justify-between px-5 shrink-0">
        {/* Back to Queue */}
        <button
          type="button"
          onClick={() => router.push("/officer")}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer font-inter"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Review Queue</span>
        </button>

        {/* Center: Document title & status badge */}
        <div className="flex items-center gap-3">
          <StatusBadge status={displayStatus} />
          <span className="text-[13px] font-semibold text-slate-800 font-inter max-w-[320px] truncate hidden sm:block">
            {displayTitle}
          </span>
          <span className="text-[11px] text-slate-400 font-numbers tabular-nums hidden md:block">
            {documentId}
          </span>
        </div>

        {/* Download original button */}
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
      {decisionSuccess && (
        <div className="px-5 py-2 bg-emerald-50 border-b border-emerald-200 text-[12px] text-emerald-800 font-inter flex items-center justify-between animate-in fade-in shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="font-medium">{decisionSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setDecisionSuccess(null)}
            className="text-[11px] text-emerald-700 underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ===== MAIN CONTENT — SPLIT SCREEN ===== */}
      <div className="flex-1 flex overflow-hidden">
        {/* ===== LEFT PANEL: Document Workspace ===== */}
        <div className="w-[58%] min-w-[420px] border-r border-slate-200 flex flex-col bg-white overflow-hidden">
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
          <div className="flex-1 overflow-hidden">
            {isDocLoading ? (
              <div className="p-8 space-y-4 animate-pulse">
                <div className="h-8 w-64 bg-slate-100 rounded" />
                <div className="h-4 w-48 bg-slate-50 rounded" />
                <div className="h-64 w-full bg-slate-100 rounded-lg mt-6" />
              </div>
            ) : docError ? (
              <div className="p-8">
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 font-inter">
                  {docError}
                </div>
              </div>
            ) : leftTab === "preview" ? (
              /* REAL DOCUMENT PREVIEW (PDF, DOCX, XLSX) */
              <DocumentPreviewViewer
                documentId={documentId}
                title={displayTitle}
                docType={doc?.type ?? mockDoc?.type}
                fileSizeMb={mockDoc?.file_size_mb}
                uploadedAt={displayUploadedAt}
                advisorName={displayAdvisor}
                activeFlagIndex={activeFlagIndex}
                onSelectFlag={(index) => setActiveFlagIndex(index)}
                onDownload={handleDownload}
              />
            ) : (
              /* SUBMISSION DETAILS & AUDIT LOG VIEW */
              <div className="h-full overflow-y-auto p-6 sm:p-8 space-y-6">
                {/* Header */}
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
                      <p className="text-[13px] font-medium text-slate-800 font-numbers tabular-nums">
                        {displayUploadedAt ? formatDateTime(displayUploadedAt) : "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Hash className="h-3.5 w-3.5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">File Size</p>
                      <p className="text-[13px] font-medium text-slate-800 font-numbers tabular-nums">
                        {displaySize}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Layers className="h-3.5 w-3.5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Version</p>
                      <p className="text-[13px] font-medium text-slate-800 font-numbers tabular-nums">
                        v{displayVersion}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Thread ID</p>
                      <p className="text-[13px] font-medium text-slate-800 font-numbers tabular-nums">
                        {doc?.thread_id ?? mockDoc?.thread_id ?? "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Prior Feedback */}
                {mockDoc?.officer_feedback && (
                  <div>
                    <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2">
                      Previous Officer Determination
                    </h3>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                      <p className="text-[12px] text-slate-700 leading-relaxed font-inter">
                        {mockDoc.officer_feedback}
                      </p>
                      {mockDoc.officer_name && (
                        <p className="text-[10px] text-slate-400 mt-2">
                          — {mockDoc.officer_name}
                          {mockDoc.reviewed_at && (
                            <span> · {formatDateTime(mockDoc.reviewed_at)}</span>
                          )}
                        </p>
                      )}
                    </div>
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
                          className="rounded-xl border border-slate-200 p-3 text-[12px]"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-700">
                              v{threadEntries.length - i}
                            </span>
                            <StatusBadge status={entry.status} />
                          </div>
                          {entry.review?.comment && (
                            <p className="text-[11px] text-slate-600 mt-1.5">
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
                          <span className="text-slate-400 font-numbers tabular-nums">
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

        {/* ===== RIGHT PANEL: GEMINI AI ASSIST + BESPOKE DECISION PANEL ===== */}
        <div className="flex-1 min-w-[360px] flex flex-col bg-slate-100/40 overflow-hidden">
          {/* Scrollable Gemini AI Window */}
          <div className="flex-1 overflow-hidden">
            <AiAssistPanel
              analysis={analysis}
              mockAnalysis={usingMock ? MOCK_AI_ANALYSIS : undefined}
              mockPrecedents={usingMock ? MOCK_PRECEDENTS : undefined}
              isLoading={isAnalysisLoading}
              errorMessage={analysisError}
              onRetry={handleRetryAnalysis}
              isRetrying={isRetrying}
              activeFlagIndex={activeFlagIndex}
              onSelectFlag={(idx) => setActiveFlagIndex(idx)}
              onInsertComment={(text) => setDecisionComment(text)}
            />
          </div>

          {/* Bespoke Decision Controls (Authoritative) */}
          <ReviewDecisionPanel
            documentStatus={displayStatus}
            onSubmitDecision={handleSubmitDecision}
            disabled={isDocLoading || !!docError}
            externalComment={decisionComment}
          />
        </div>
      </div>
    </div>
  );
}
