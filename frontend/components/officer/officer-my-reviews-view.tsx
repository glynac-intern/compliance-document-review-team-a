"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ChevronDown,
  FileCheck2,
  Download,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { FileTypeIcon } from "@/components/ui/file-type-icon";
import { reviewsApi } from "@/lib/reviews-api";
import { documentsApi, type BackendDocumentType } from "@/lib/documents-api";
import { ApiError } from "@/lib/api-client";
import { MOCK_COMPLETED_REVIEWS } from "@/lib/mock-officer-data";

interface OfficerMyReviewsViewProps {
  onShowToast?: (msg: string) => void;
}

type ReviewStatus = "all" | "approved" | "needs_revision" | "rejected";

// TA-101: reviewed documents only ever land in one of these three
// terminal statuses -- pending_review belongs to the Review Queue, not here.
const TERMINAL_STATUSES = ["approved", "needs_revision", "rejected"] as const;

const OUTCOME_FILTERS: { value: ReviewStatus; label: string }[] = [
  { value: "all", label: "All Decisions" },
  { value: "approved", label: "Approved" },
  { value: "needs_revision", label: "Needs Revision" },
  { value: "rejected", label: "Rejected" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "advisor", label: "Advisor" },
];

// Unified review item shape
interface UnifiedReview {
  id: string;
  title: string;
  advisor_name: string;
  status: "approved" | "needs_revision" | "rejected";
  type: BackendDocumentType;
  uploaded_at: string;
  reviewed_at: string | null;
  officer_feedback: string;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr ?? "—";
  }
}

// Offline/mock fallback only -- the mock item's free-text "type" category
// (e.g. "Promotional Brochure") doesn't map to a real BackendDocumentType,
// so it's inferred here purely for the fallback's own icon rendering.
function adaptMockToUnifiedReview(r: (typeof MOCK_COMPLETED_REVIEWS)[0]): UnifiedReview {
  const inferredType: BackendDocumentType = r.type.includes("Brochure")
    ? "pdf"
    : r.type.includes("Factsheet")
      ? "xlsx"
      : "docx";
  return {
    id: r.id,
    title: r.title,
    advisor_name: r.advisor_name,
    status: r.status as "approved" | "needs_revision" | "rejected",
    type: inferredType,
    uploaded_at: r.uploaded_at,
    reviewed_at: r.reviewed_at,
    officer_feedback: r.officer_feedback,
  };
}

async function fetchAllReviews(): Promise<UnifiedReview[]> {
  const lists = await Promise.all(
    TERMINAL_STATUSES.map((status) => reviewsApi.getQueue(status))
  );
  const docs = lists.flat();

  return Promise.all(
    docs.map(async (doc): Promise<UnifiedReview> => {
      let comment = "";
      let decidedAt: string | null = null;
      try {
        const reviews = await documentsApi.getReviews(doc.id);
        const ownReview = reviews.find((r) => r.document_id === doc.id);
        comment = ownReview?.comment ?? "";
        decidedAt = ownReview?.decided_at ?? null;
      } catch {
        // Leave feedback/date blank if the lookup fails -- the row
        // itself is still a real, correctly-identified document.
      }
      return {
        id: doc.id,
        title: doc.original_filename ?? `Document ${doc.id.slice(0, 8)}`,
        advisor_name: doc.advisor_name,
        status: doc.status as "approved" | "needs_revision" | "rejected",
        type: doc.type,
        uploaded_at: doc.uploaded_at,
        reviewed_at: decidedAt,
        officer_feedback: comment,
      };
    })
  );
}

export function OfficerMyReviewsView({ onShowToast }: OfficerMyReviewsViewProps) {
  const router = useRouter();
  const [allReviews, setAllReviews] = React.useState<UnifiedReview[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [outcomeFilter, setOutcomeFilter] = React.useState<ReviewStatus>("all");
  const [sortBy, setSortBy] = React.useState("newest");

  // TA-101: real, persisted review records -- one queue fetch per
  // terminal status, then each document's own decision (comment +
  // decided_at) looked up via its thread's review history.
  const handleRetry = React.useCallback(() => {
    setIsLoading(true);
    fetchAllReviews()
      .then((reviews) => {
        setAllReviews(reviews);
        setError(null);
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          setError(err.message);
        }
        setAllReviews(
          MOCK_COMPLETED_REVIEWS.filter(
            (r) => r.status === "approved" || r.status === "needs_revision" || r.status === "rejected"
          ).map(adaptMockToUnifiedReview)
        );
      })
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    let ignore = false;

    fetchAllReviews()
      .then((reviews) => {
        if (!ignore) {
          setAllReviews(reviews);
          setError(null);
        }
      })
      .catch((err) => {
        if (!ignore) {
          // Fallback to mock data when backend is offline
          if (err instanceof ApiError) {
            setError(err.message);
          }
          setAllReviews(
            MOCK_COMPLETED_REVIEWS.filter(
              (r) => r.status === "approved" || r.status === "needs_revision" || r.status === "rejected"
            ).map(adaptMockToUnifiedReview)
          );
        }
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const filteredReviews = React.useMemo(() => {
    let result = [...allReviews];

    if (outcomeFilter !== "all") {
      result = result.filter((r) => (r.status as string) === outcomeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.advisor_name.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          r.officer_feedback.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      const dateA = a.reviewed_at ?? a.uploaded_at;
      const dateB = b.reviewed_at ?? b.uploaded_at;
      switch (sortBy) {
        case "oldest":
          return new Date(dateA).getTime() - new Date(dateB).getTime();
        case "advisor":
          return a.advisor_name.localeCompare(b.advisor_name);
        case "newest":
        default:
          return new Date(dateB).getTime() - new Date(dateA).getTime();
      }
    });

    return result;
  }, [allReviews, outcomeFilter, searchQuery, sortBy]);

  const handleExport = React.useCallback(() => {
    const csvRows = [
      ["Document ID", "Title", "Advisor", "Status", "Feedback", "Date"],
      ...filteredReviews.map((r) => [
        r.id,
        `"${r.title.replace(/"/g, '""')}"`,
        r.advisor_name,
        r.status,
        `"${r.officer_feedback.replace(/"/g, '""')}"`,
        formatDate(r.reviewed_at ?? r.uploaded_at),
      ]),
    ];
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `verity_reviews_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onShowToast?.("Reviews exported to CSV.");
  }, [filteredReviews, onShowToast]);

  const counts = React.useMemo(() => {
    const total = allReviews.length;
    const approved = allReviews.filter((r) => r.status === "approved").length;
    const revision = allReviews.filter((r) => r.status === "needs_revision").length;
    const rejected = allReviews.filter((r) => r.status === "rejected").length;
    return { total, approved, revision, rejected };
  }, [allReviews]);

  return (
    <div className="space-y-5 font-inter select-none">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-medium text-[#1e4c77] dark:text-[#7fb2e3] tracking-tight font-inter">
            My Reviews
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Compact counts */}
          <div className="hidden md:flex items-center gap-2.5 text-[11px] font-inter text-[#1e4c77]/60 dark:text-[#7fb2e3]/60">
            <span className="font-numbers tabular-nums font-medium text-[#1e4c77] dark:text-[#7fb2e3]">{counts.total}</span>
            <span className="text-[#1e4c77]/50 dark:text-[#7fb2e3]/50">total</span>
            <span className="h-3 w-px bg-[#1e4c77]/15 dark:bg-[#7fb2e3]/15" />
            <span className="font-numbers tabular-nums text-[#1e4c77]/70 dark:text-[#7fb2e3]/70">{counts.approved} approved</span>
            <span className="h-3 w-px bg-[#1e4c77]/15 dark:bg-[#7fb2e3]/15" />
            <span className="font-numbers tabular-nums text-[#1e4c77]/70 dark:text-[#7fb2e3]/70">{counts.revision} revisions</span>
            <span className="h-3 w-px bg-[#1e4c77]/15 dark:bg-[#7fb2e3]/15" />
            <span className="font-numbers tabular-nums text-[#1e4c77]/70 dark:text-[#7fb2e3]/70">{counts.rejected} rejected</span>
          </div>

          <button
            type="button"
            onClick={handleExport}
            className="h-8 px-3 rounded-lg border border-[#1e4c77]/15 dark:border-[#7fb2e3]/20 bg-white dark:bg-slate-800 hover:bg-[#1e4c77]/5 dark:hover:bg-[#7fb2e3]/10 text-[11px] font-medium text-[#1e4c77] dark:text-[#7fb2e3] transition-colors cursor-pointer flex items-center gap-1.5 font-inter"
          >
            <Download className="h-3.5 w-3.5 stroke-[1.8]" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#1e4c77]/40 dark:text-[#7fb2e3]/40 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reviews..."
            className="w-full h-8 pl-9 pr-3 rounded-lg border border-[#1e4c77]/15 dark:border-[#7fb2e3]/20 bg-white dark:bg-slate-800 text-[12px] text-slate-800 dark:text-slate-100 placeholder:text-[#1e4c77]/35 dark:placeholder:text-[#7fb2e3]/40 font-inter transition-all focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[#1e4c77]/30 dark:focus:ring-[#7fb2e3]/30"
          />
        </div>

        <div className="relative">
          <select
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value as ReviewStatus)}
            className="h-8 pl-3 pr-7 rounded-lg border border-[#1e4c77]/15 dark:border-[#7fb2e3]/20 bg-white dark:bg-slate-800 text-[12px] text-[#1e4c77] dark:text-[#7fb2e3] font-inter appearance-none cursor-pointer hover:border-[#1e4c77]/25 dark:hover:border-[#7fb2e3]/30 focus:outline-none focus:ring-2 focus:ring-[#1e4c77]/30 dark:focus:ring-[#7fb2e3]/30 focus:border-transparent transition-all"
          >
            {OUTCOME_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-[#1e4c77]/40 dark:text-[#7fb2e3]/40 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-8 pl-3 pr-7 rounded-lg border border-[#1e4c77]/15 dark:border-[#7fb2e3]/20 bg-white dark:bg-slate-800 text-[12px] text-[#1e4c77] dark:text-[#7fb2e3] font-inter appearance-none cursor-pointer hover:border-[#1e4c77]/25 dark:hover:border-[#7fb2e3]/30 focus:outline-none focus:ring-2 focus:ring-[#1e4c77]/30 dark:focus:ring-[#7fb2e3]/30 focus:border-transparent transition-all"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-[#1e4c77]/40 dark:text-[#7fb2e3]/40 pointer-events-none" />
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs text-rose-700 dark:text-rose-300 font-inter">
          {error}{" "}
          <button
            onClick={handleRetry}
            className="underline text-rose-900 dark:text-rose-200 hover:text-rose-700 dark:hover:text-rose-100 font-medium cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-[#1e4c77]/10 dark:border-[#7fb2e3]/15 bg-white dark:bg-slate-900 overflow-hidden">
        {isLoading ? (
          // Loading skeleton
          <div className="divide-y divide-[#1e4c77]/[0.06] dark:divide-[#7fb2e3]/10">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4">
                <div className="h-8 w-8 rounded-lg bg-[#1e4c77]/5 dark:bg-[#7fb2e3]/10 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-48 bg-[#1e4c77]/5 dark:bg-[#7fb2e3]/10 animate-pulse rounded" />
                  <div className="h-2.5 w-32 bg-[#1e4c77]/[0.04] dark:bg-[#7fb2e3]/[0.08] animate-pulse rounded" />
                </div>
                <div className="h-3 w-20 bg-[#1e4c77]/5 dark:bg-[#7fb2e3]/10 animate-pulse rounded" />
                <div className="h-3 w-16 bg-[#1e4c77]/[0.04] dark:bg-[#7fb2e3]/[0.08] animate-pulse rounded" />
              </div>
            ))}
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="p-12 text-center font-inter">
            <FileCheck2 className="h-7 w-7 text-[#1e4c77]/25 dark:text-[#7fb2e3]/25 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No reviews found</p>
            <p className="text-[11px] text-[#1e4c77]/40 dark:text-[#7fb2e3]/40 mt-1">
              {searchQuery || outcomeFilter !== "all"
                ? "Try adjusting your filters."
                : "No reviews recorded yet."}
            </p>
          </div>
        ) : (
          <table className="w-full text-[12px] font-inter">
            <thead>
              <tr className="bg-[#1e4c77]/[0.03] dark:bg-[#7fb2e3]/[0.06] border-b border-[#1e4c77]/10 dark:border-[#7fb2e3]/15">
                <th className="text-left py-2.5 px-4 text-[11px] font-medium text-[#1e4c77]/50 dark:text-[#7fb2e3]/50 tracking-normal">
                  Document
                </th>
                <th className="text-left py-2.5 px-4 text-[11px] font-medium text-[#1e4c77]/50 dark:text-[#7fb2e3]/50 tracking-normal">
                  Advisor
                </th>
                <th className="text-left py-2.5 px-4 text-[11px] font-medium text-[#1e4c77]/50 dark:text-[#7fb2e3]/50 tracking-normal">
                  Type
                </th>
                <th className="text-left py-2.5 px-4 text-[11px] font-medium text-[#1e4c77]/50 dark:text-[#7fb2e3]/50 tracking-normal">
                  Status
                </th>
                <th className="text-left py-2.5 px-4 text-[11px] font-medium text-[#1e4c77]/50 dark:text-[#7fb2e3]/50 tracking-normal">
                  Feedback
                </th>
                <th className="text-right py-2.5 px-4 text-[11px] font-medium text-[#1e4c77]/50 dark:text-[#7fb2e3]/50 tracking-normal">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e4c77]/[0.06] dark:divide-[#7fb2e3]/10">
              {filteredReviews.map((review) => (
                <tr
                  key={review.id}
                  onClick={() => router.push(`/officer/documents/${review.id}`)}
                  className="hover:bg-[#1e4c77]/[0.02] dark:hover:bg-[#7fb2e3]/[0.05] transition-colors cursor-pointer group"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileTypeIcon
                        filename={review.title}
                        type={review.type}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="text-[12px] font-normal text-slate-800 dark:text-slate-200 truncate max-w-[240px] font-inter group-hover:text-[#1e4c77] dark:group-hover:text-[#7fb2e3] transition-colors">
                          {review.title}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4 text-[12px] text-slate-600 dark:text-slate-400 font-inter">
                    {review.advisor_name}
                  </td>

                  <td className="py-3 px-4 text-[12px] text-[#1e4c77]/50 dark:text-[#7fb2e3]/50 font-inter uppercase">
                    {review.type}
                  </td>

                  <td className="py-3 px-4">
                    <StatusBadge status={review.status} />
                  </td>

                  <td className="py-3 px-4 max-w-[280px]">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-inter" title={review.officer_feedback}>
                      {review.officer_feedback || "—"}
                    </p>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <span className="text-[11px] text-[#1e4c77]/45 dark:text-[#7fb2e3]/45 font-inter font-numbers tabular-nums">
                      {formatDate(review.reviewed_at ?? review.uploaded_at)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer count */}
      {!isLoading && filteredReviews.length > 0 && (
        <p className="text-[11px] text-[#1e4c77]/40 dark:text-[#7fb2e3]/40 font-inter">
          Showing{" "}
          <span className="font-numbers tabular-nums font-medium text-[#1e4c77]/60 dark:text-[#7fb2e3]/60">
            {filteredReviews.length}
          </span>{" "}
          of{" "}
          <span className="font-numbers tabular-nums font-medium text-[#1e4c77]/60 dark:text-[#7fb2e3]/60">
            {allReviews.length}
          </span>{" "}
          reviews
        </p>
      )}
    </div>
  );
}
