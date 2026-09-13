"use client";

/**
 * TA-66: minimal real detail screen -- exists so "selecting a row opens
 * the review screen" is a genuine navigation to real document data,
 * not a dead link or an alert(). The actual DECISION workflow (approve
 * / reject / needs_revision, with the AI assist panel) is separate,
 * later work -- out of this ticket's scope, which is specifically the
 * queue + filter + navigation.
 */

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { useRequireAuth } from "@/lib/use-require-auth";
import { apiFetch, ApiError } from "@/lib/api-client";
import { documentsApi, type BackendDocument } from "@/lib/documents-api";
import { StatusBadge } from "@/components/ui/status-badge";
import { FileTypeIcon } from "@/components/ui/file-type-icon";

export default function OfficerDocumentDetailPage() {
  const { isReady } = useRequireAuth("officer");
  const router = useRouter();
  const params = useParams();
  const documentId = params.id as string;

  const [doc, setDoc] = React.useState<BackendDocument | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [downloadError, setDownloadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isReady) return;
    apiFetch<BackendDocument>(`/review/documents/${documentId}`)
      .then(setDoc)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Unable to load this document."));
  }, [isReady, documentId]);

  const handleDownload = async () => {
    if (!doc) return;
    setIsDownloading(true);
    setDownloadError(null);
    try {
      await documentsApi.downloadFile(doc.id, doc.original_filename || `document-${doc.id}`);
    } catch (err) {
      setDownloadError(err instanceof ApiError ? err.message : "Failed to download file.");
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isReady) return null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-6 font-inter">
      <button
        onClick={() => router.push("/officer")}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 mb-4 cursor-pointer"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to queue
      </button>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 mb-4">
          {error}
        </div>
      )}

      {downloadError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 mb-4">
          {downloadError}
        </div>
      )}

      {doc && (
        <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-start gap-4 mb-4">
            <FileTypeIcon filename={doc.original_filename ?? ""} type={doc.type} size="lg" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <StatusBadge status={doc.status} />
                <span className="text-xs text-slate-400 font-mono">
                  {doc.id.slice(0, 8)}
                </span>
              </div>
              <h1 className="text-xl font-medium text-slate-900 leading-snug break-words">
                {doc.original_filename ?? `Document ${doc.id.slice(0, 8)}`}
              </h1>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-100 text-xs text-slate-600 mb-5">
            <div>
              <span className="text-slate-400 block text-[11px]">Format</span>
              <span className="font-medium text-slate-800 uppercase">{doc.type}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Submitted</span>
              <span className="font-medium text-slate-800">
                {new Date(doc.uploaded_at).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isDownloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#1e4c77]" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span>{isDownloading ? "Downloading..." : "Download Original File"}</span>
            </button>

            <p className="text-xs text-slate-400 italic">
              The full review and decision workflow is separate, upcoming work.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
