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
import { ArrowLeft, Download, FileWarning } from "lucide-react";
import { useRequireAuth } from "@/lib/use-require-auth";
import { apiFetch, fetchFileBlob, ApiError } from "@/lib/api-client";
import type { BackendDocument } from "@/lib/documents-api";

interface AnalysisFlag {
  passage_excerpt: string;
  explanation: string;
  severity: string;
}

interface AnalysisResponse {
  status: string;
  summary: string | null;
  flags: AnalysisFlag[];
  precedents: { decision: string; comment: string | null }[];
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

    apiFetch<AnalysisResponse>(`/documents/${documentId}/analysis`)
      .then(setAnalysis)
      .catch(() => setAnalysis(null));
  }, [isReady, documentId]);

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
            <p className="text-xs text-slate-400">Loading assist panel...</p>
          ) : analysis.status !== "succeeded" ? (
            <p className="text-xs text-slate-400">Analysis not yet available.</p>
          ) : (
            <div className="space-y-4">
              {analysis.summary && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 mb-1">Summary</p>
                  <p className="text-xs text-slate-700 leading-relaxed">{analysis.summary}</p>
                </div>
              )}
              {analysis.flags.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 mb-1.5">
                    Flags ({analysis.flags.length})
                  </p>
                  <div className="space-y-2">
                    {analysis.flags.map((flag, i) => (
                      <div key={i} className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs">
                        <p className="italic text-slate-700 mb-1">&ldquo;{flag.passage_excerpt}&rdquo;</p>
                        <p className="text-slate-600">{flag.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
