"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Inbox, LogOut } from "lucide-react";
import { useRequireAuth } from "@/lib/use-require-auth";
import { useAuth } from "@/lib/auth-context";
import { reviewsApi, type QueueDocument } from "@/lib/reviews-api";
import { ApiError } from "@/lib/api-client";
import type { BackendDocumentStatus } from "@/lib/documents-api";

const STATUS_FILTERS: { value: BackendDocumentStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending_review", label: "Pending Review" },
  { value: "approved", label: "Approved" },
  { value: "needs_revision", label: "Needs Revision" },
  { value: "rejected", label: "Rejected" },
];

const STATUS_BADGE_STYLES: Record<BackendDocumentStatus, string> = {
  pending_review: "bg-blue-50 text-[#1e4c77] border-blue-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  needs_revision: "bg-amber-50 text-amber-800 border-amber-200",
  rejected: "bg-rose-50 text-rose-800 border-rose-200",
};

const STATUS_LABELS: Record<BackendDocumentStatus, string> = {
  pending_review: "Pending Review",
  approved: "Approved",
  needs_revision: "Needs Revision",
  rejected: "Rejected",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function OfficerQueuePage() {
  const { isReady } = useRequireAuth("officer");
  const { logout } = useAuth();
  const router = useRouter();

  const [activeFilter, setActiveFilter] = React.useState<BackendDocumentStatus | "all">("all");
  const [documents, setDocuments] = React.useState<QueueDocument[] | null>(null);
  const [totalUnfiltered, setTotalUnfiltered] = React.useState<number | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadQueue = React.useCallback(async (filter: BackendDocumentStatus | "all") => {
    setIsLoading(true);
    setError(null);
    try {
      const filtered = await reviewsApi.getQueue(filter === "all" ? undefined : filter);
      setDocuments(filtered);
      // TA-66: also need the TRUE unfiltered total, to distinguish a
      // genuinely empty queue from "no results for this filter".
      if (filter === "all") {
        setTotalUnfiltered(filtered.length);
      } else {
        const all = await reviewsApi.getQueue();
        setTotalUnfiltered(all.length);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load the review queue.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (isReady) {
      loadQueue(activeFilter);
    }
  }, [isReady, activeFilter, loadQueue]);

  if (!isReady) return null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <header className="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-900">Compliance Review Queue</h1>
        <button
          onClick={logout}
          className="h-9 w-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </header>

      <div className="max-w-5xl mx-auto p-6">
        {/* Status filter -- active filter clearly visible */}
        <div className="flex items-center gap-2 mb-4">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setActiveFilter(f.value)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                activeFilter === f.value
                  ? "bg-[#1e4c77] text-white border-[#1e4c77]"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 mb-4">
            {error}
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          {isLoading ? (
            <div className="p-10 text-center text-sm text-slate-400">Loading queue...</div>
          ) : !documents || documents.length === 0 ? (
            // TA-66: a genuinely empty queue reads differently from an
            // empty FILTER result.
            <div className="p-10 text-center">
              <div className="h-10 w-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Inbox className="h-5 w-5" />
              </div>
              {totalUnfiltered === 0 ? (
                <>
                  <p className="text-sm font-semibold text-slate-800">Queue is empty</p>
                  <p className="text-xs text-slate-400 mt-1">
                    No documents have been submitted for review yet.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-slate-800">
                    No documents match this filter
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {totalUnfiltered} document{totalUnfiltered !== 1 ? "s" : ""} in the queue overall --
                    try a different status.
                  </p>
                </>
              )}
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-[#f8fafc] border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="text-left py-2.5 px-4 font-medium">Document</th>
                  <th className="text-left py-2.5 px-4 font-medium">Advisor</th>
                  <th className="text-left py-2.5 px-4 font-medium">Status</th>
                  <th className="text-left py-2.5 px-4 font-medium">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((doc) => (
                  <tr
                    key={doc.id}
                    onClick={() => router.push(`/officer/documents/${doc.id}`)}
                    className="hover:bg-slate-50 cursor-pointer"
                  >
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {doc.original_filename ?? `Document ${doc.id.slice(0, 8)}`}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{doc.advisor_name}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full border text-[11px] font-medium ${STATUS_BADGE_STYLES[doc.status]}`}>
                        {STATUS_LABELS[doc.status]}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{formatDate(doc.uploaded_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
