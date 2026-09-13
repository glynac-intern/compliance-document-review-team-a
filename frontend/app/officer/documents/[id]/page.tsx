"use client";

/**
 * TA-67: officer's document viewer -- original document on the left,
 * assist panel on the right, per the blueprint layout.
 *
 * Rendering scope, stated honestly: PDF renders inline via the
 * browser's native PDF viewer (a blob URL in an iframe -- the file
 * endpoint requires a Bearer token, which a plain iframe src can't
 * attach, so the file is fetched via JS and rendered from a blob URL
 * instead). DOCX and XLSX have no robust native browser rendering
 * without adding a real client-side parsing library (a much larger
 * scope than this ticket) -- for those, a clear download action is
 * offered instead of failing silently, which is exactly what this
 * ticket's own acceptance criteria calls for.
 *
 * Opening this page calls GET /review/documents/{id}, which already
 * records a view in the audit trail (TA-28) -- no new backend work
 * needed for that criterion.
 */

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, FileWarning, Check, X, RotateCcw } from "lucide-react";
import { useRequireAuth } from "@/lib/use-require-auth";
import { apiFetch, fetchFileBlob, ApiError } from "@/lib/api-client";
import type { BackendDocument } from "@/lib/documents-api";
import { reviewsApi, type DecisionStatus } from "@/lib/reviews-api";
import { documentsApi, type ThreadEntry } from "@/lib/documents-api";

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

export default function OfficerDocumentViewerPage() {
  const { isReady } = useRequireAuth("officer");
  const router = useRouter();
  const params = useParams();
  const documentId = params.id as string;

  const [doc, setDoc] = React.useState<BackendDocument | null>(null);
  const [analysis, setAnalysis] = React.useState<AnalysisResponse | null>(null);
  const [fileBlobUrl, setFileBlobUrl] = React.useState<string | null>(null);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // TA-69: the recorded decision, if this document is no longer
  // pending -- reused via the same thread endpoint TA-64 already
  // wired in, which carries each entry's own review inline.
  const [recordedReview, setRecordedReview] = React.useState<ThreadEntry["review"] | null>(null);
  const [comment, setComment] = React.useState("");
  const [isSubmittingDecision, setIsSubmittingDecision] = React.useState(false);
  const [decisionError, setDecisionError] = React.useState<string | null>(null);
  const [justDecided, setJustDecided] = React.useState(false);
  const [isRetrying, setIsRetrying] = React.useState(false);

  // TA-70: a first-time analysis failure comes back as a 503 (a raised
  // HTTPException, not a normal 200 with status="failed") -- this is
  // caught here and turned into a genuine, distinct failed state,
  // rather than silently leaving the panel stuck on "loading" forever.
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

  React.useEffect(() => {
    if (!isReady) return;

    // This call itself records the view in the audit trail (TA-28) --
    // just by loading the page, not a separate action.
    apiFetch<BackendDocument>(`/review/documents/${documentId}`)
      .then((d) => {
        setDoc(d);
        return fetchFileBlob(`/documents/${documentId}/file`);
      })
      .then((blob) => {
        setFileBlobUrl(URL.createObjectURL(blob));
      })
      .catch((err) => {
        // A file that fails to load (or isn't inline-renderable)
        // offers a download instead of failing silently.
        setFileError(err instanceof ApiError ? err.message : "Unable to load the file preview.");
      });

    loadAnalysis();

    documentsApi
      .getThread(documentId)
      .then((thread) => {
        const entry = thread.find((t) => t.document_id === documentId);
        setRecordedReview(entry?.review ?? null);
      })
      .catch(() => setRecordedReview(null));
  }, [isReady, documentId]);

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
      // TA-69: the queue reflects it -- refetching the document itself
      // confirms the server's real, persisted status, not an optimistic
      // local guess.
      const updated = await apiFetch<BackendDocument>(`/review/documents/${documentId}`);
      setDoc(updated);
    } catch (err) {
      // The server's real rejection (e.g. already decided by someone
      // else in the meantime) surfaces clearly, not silently.
      setDecisionError(err instanceof ApiError ? err.message : "Failed to record decision.");
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  React.useEffect(() => {
    return () => {
      if (fileBlobUrl) URL.revokeObjectURL(fileBlobUrl);
    };
  }, [fileBlobUrl]);

  const handleDownload = async () => {
    try {
      const blob = await fetchFileBlob(`/documents/${documentId}/file`);
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = doc?.original_filename ?? `document-${documentId}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Download failed.");
    }
  };

  if (!isReady) return null;

  const isPdf = doc?.type === "pdf";

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      <header className="border-b border-slate-200 bg-white px-6 py-3 flex items-center justify-between shrink-0">
        <button
          onClick={() => router.push("/officer")}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to queue
        </button>
        <h1 className="text-sm font-bold text-slate-900">
          {doc?.original_filename ?? "Document Review"}
        </h1>
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-2.5 py-1.5"
        >
          <Download className="h-3.5 w-3.5" /> Download
        </button>
      </header>

      {error && (
        <div className="mx-6 mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* TA-67: original document on the LEFT, assist panel on the
          RIGHT -- per the blueprint layout. min-w-0 on each pane keeps
          this workable at a normal laptop width (~1366px) without one
          side collapsing the other. */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 min-h-0">
        <div className="flex-1 min-w-0 rounded-xl border border-slate-200 bg-white overflow-hidden flex flex-col">
          {isPdf && fileBlobUrl ? (
            <iframe src={fileBlobUrl} className="flex-1 w-full" title="Document preview" />
          ) : fileError ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
              <FileWarning className="h-8 w-8 text-slate-300" />
              <p className="text-xs text-slate-500">{fileError}</p>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[#1e4c77] rounded-lg px-3 py-2"
              >
                <Download className="h-3.5 w-3.5" /> Download to view
              </button>
            </div>
          ) : doc && !isPdf ? (
            // DOCX/XLSX: no robust native browser rendering -- clear
            // download action instead of a failed silent preview.
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
              <FileWarning className="h-8 w-8 text-slate-300" />
              <p className="text-xs text-slate-500">
                {doc.type.toUpperCase()} files can't be previewed inline. Download to view the original.
              </p>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[#1e4c77] rounded-lg px-3 py-2"
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

        {/* Assist panel */}
        <div className="w-full lg:w-96 shrink-0 rounded-xl border border-slate-200 bg-white p-4 overflow-y-auto">
          <h2 className="text-xs font-bold text-slate-900 mb-3">AI Assist</h2>
          {!analysis ? (
            // TA-70: "not yet loaded" -- our own client fetch is still
            // in flight. The backend runs not_started -> in_progress
            // synchronously within one request, so this single loading
            // state visually covers that whole period from the
            // reviewer's perspective; succeeded and failed are the two
            // genuinely distinct end states the client can observe.
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="h-3 w-3 rounded-full border-2 border-slate-300 border-t-[#2575bc] animate-spin" />
              Analyzing document...
            </div>
          ) : analysis.status === "failed" ? (
            // TA-70: a genuine, distinct failed state -- not a blank
            // panel, with a real retry control. The document, queue,
            // and decision form are all unaffected by this (they don't
            // depend on analysis at all), verified by removing the
            // LLM API key and walking the full flow.
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center">
              <FileWarning className="h-6 w-6 text-rose-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-rose-800 mb-1">
                AI assist is currently unavailable
              </p>
              <p className="text-[11px] text-rose-600 mb-3">
                {analysis.error_message ?? "The analysis could not be completed."}
              </p>
              <p className="text-[11px] text-slate-500 mb-3">
                You can still review and decide on this document normally --
                the assist panel is supplementary, not required.
              </p>
              <button
                onClick={handleRetryAnalysis}
                disabled={isRetrying}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold disabled:opacity-50"
              >
                {isRetrying ? "Retrying..." : "Retry Analysis"}
              </button>
            </div>
          ) : (
            // TA-68: summary at top, flags always carry passage + matched
            // rule + reason + severity together (never severity alone),
            // a genuine clean-result state when there are no flags, and
            // the three precedents -- purely factual, nothing here
            // pre-fills or suggests a decision.
            <div className="space-y-4">
              {analysis.summary && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 mb-1">Summary</p>
                  <p className="text-xs text-slate-700 leading-relaxed">{analysis.summary}</p>
                </div>
              )}

              <div>
                <p className="text-[11px] font-semibold text-slate-500 mb-1.5">
                  Flags ({analysis.flags.length})
                </p>
                {analysis.flags.length === 0 ? (
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
                    No issues flagged -- this document read as clean.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {analysis.flags.map((flag, i) => (
                      <div key={i} className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              flag.severity === "high"
                                ? "bg-rose-100 text-rose-800"
                                : flag.severity === "medium"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {flag.severity}
                          </span>
                          {flag.matched_rule && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              {flag.matched_rule.type.replace(/_/g, " ")}
                            </span>
                          )}
                        </div>
                        <p className="italic text-slate-700">&ldquo;{flag.passage_excerpt}&rdquo;</p>
                        {flag.matched_rule && (
                          <p className="text-slate-600 border-l-2 border-amber-300 pl-2">
                            {flag.matched_rule.text}
                          </p>
                        )}
                        <p className="text-slate-600">{flag.explanation}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-[11px] font-semibold text-slate-500 mb-1.5">
                  Similar Precedents ({analysis.precedents.length})
                </p>
                {analysis.precedents.length === 0 ? (
                  <p className="text-xs text-slate-400">No similar precedents found yet.</p>
                ) : (
                  <div className="space-y-2">
                    {analysis.precedents.map((p, i) => (
                      <div key={i} className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 text-xs space-y-1">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            p.decision === "approved"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {p.decision.replace(/_/g, " ")}
                        </span>
                        {p.comment && <p className="text-slate-600">{p.comment}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TA-69: the decision action -- what the whole queue exists
          for. Shows the recorded decision instead of the form once
          the document is no longer pending; the comment is what the
          advisor will actually read, made explicit in the label. */}
      <div className="border-t border-slate-200 bg-white px-6 py-4 shrink-0">
        {doc?.status !== "pending_review" || recordedReview ? (
          <div className="max-w-3xl mx-auto">
            {justDecided && (
              <p className="text-xs font-semibold text-emerald-700 mb-2">
                Decision recorded.
              </p>
            )}
            <p className="text-xs font-semibold text-slate-800">
              Recorded decision: <span className="uppercase">{recordedReview?.status.replace(/_/g, " ") ?? doc?.status}</span>
            </p>
            {recordedReview?.comment && (
              <p className="text-xs text-slate-600 mt-1">&ldquo;{recordedReview.comment}&rdquo;</p>
            )}
            {recordedReview?.decided_at && (
              <p className="text-[11px] text-slate-400 mt-1">
                {new Date(recordedReview.decided_at).toLocaleString()}
              </p>
            )}
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-2.5">
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
                className="w-full p-2.5 rounded-xl bg-[#f4f6f8] border border-slate-200 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-[#2575bc] resize-none disabled:opacity-60"
              />
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => handleDecision("approved")}
                disabled={isSubmittingDecision}
                className="flex items-center gap-1.5 px-4 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" /> Approve
              </button>
              <button
                onClick={() => handleDecision("needs_revision")}
                disabled={isSubmittingDecision}
                className="flex items-center gap-1.5 px-4 h-10 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Request Revision
              </button>
              <button
                onClick={() => handleDecision("rejected")}
                disabled={isSubmittingDecision}
                className="flex items-center gap-1.5 px-4 h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" /> Reject
              </button>
              {isSubmittingDecision && (
                <span className="text-xs text-slate-400">Recording decision...</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
