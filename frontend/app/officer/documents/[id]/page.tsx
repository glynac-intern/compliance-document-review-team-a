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
import { ArrowLeft } from "lucide-react";
import { useRequireAuth } from "@/lib/use-require-auth";
import { apiFetch, ApiError } from "@/lib/api-client";
import type { BackendDocument } from "@/lib/documents-api";

export default function OfficerDocumentDetailPage() {
  const { isReady } = useRequireAuth("officer");
  const router = useRouter();
  const params = useParams();
  const documentId = params.id as string;

  const [doc, setDoc] = React.useState<BackendDocument | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isReady) return;
    apiFetch<BackendDocument>(`/review/documents/${documentId}`)
      .then(setDoc)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Unable to load this document."));
  }, [isReady, documentId]);

  if (!isReady) return null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-6">
      <button
        onClick={() => router.push("/officer")}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 mb-4"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to queue
      </button>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          {error}
        </div>
      )}

      {doc && (
        <div className="max-w-2xl rounded-xl border border-slate-200 bg-white p-6">
          <h1 className="text-lg font-bold text-slate-900 mb-1">
            {doc.original_filename ?? `Document ${doc.id.slice(0, 8)}`}
          </h1>
          <p className="text-xs text-slate-500 mb-4">Status: {doc.status}</p>
          <p className="text-xs text-slate-400">
            The full review and decision workflow is separate, upcoming work.
          </p>
        </div>
      )}
    </div>
  );
}
