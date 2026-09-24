"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ChevronDown,
  AlertTriangle,
  Inbox,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRequireAuth } from "@/lib/use-require-auth";
import { useAuth } from "@/lib/auth-context";
import { reviewsApi } from "@/lib/reviews-api";
import { ApiError } from "@/lib/api-client";
import type { BackendDocumentStatus } from "@/lib/documents-api";
import { OfficerSidebar, type OfficerView } from "@/components/officer/officer-sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { FileTypeIcon } from "@/components/ui/file-type-icon";
import { StatusBadge } from "@/components/ui/status-badge";
import { MOCK_QUEUE_DOCUMENTS } from "@/lib/mock-officer-data";
import { OfficerMetricsView } from "@/components/officer/officer-metrics-view";
import { OfficerMyReviewsView } from "@/components/officer/officer-my-reviews-view";
import { OfficerAuditLogView } from "@/components/officer/officer-audit-log-view";
import { SettingsView } from "@/components/common/settings-view";
import { loadSettings } from "@/lib/user-settings";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// TA-94: these previously listed fictional mock-data categories
// ("Presentation / Deck", "Market Commentary", ...) that never matched
// a real document's actual type -- selecting any of them against real
// backend data silently returned zero results. Real documents only
// ever have type pdf/docx/xlsx (see DocumentType in the backend).
const TYPE_FILTERS = [
  { value: "all", label: "All Document Types" },
  { value: "pdf", label: "PDF" },
  { value: "docx", label: "DOCX" },
  { value: "xlsx", label: "XLSX" },
];

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "advisor", label: "Advisor Name" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function daysInQueue(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
}

// Adapt mock ComplianceDocument to the shape the queue table expects
interface QueueTableRow {
  id: string;
  title: string;
  advisor_name: string;
  advisor_viewed_decision: boolean | null;
  status: BackendDocumentStatus;
  type: string;
  uploaded_at: string;
  original_filename: string | null;
  flags_count?: { high: number; medium: number; low: number };
  replaces_document_id?: string | null;
  revision_notes?: string | null;
}

function adaptMockToQueueRow(doc: (typeof MOCK_QUEUE_DOCUMENTS)[0]): QueueTableRow {
  const statusMap: Record<string, BackendDocumentStatus> = {
    pending: "pending_review",
    in_review: "pending_review",
    approved: "approved",
    needs_revision: "needs_revision",
    rejected: "rejected",
  };
  return {
    id: doc.id,
    title: doc.title,
    advisor_name: doc.advisor_name,
    advisor_viewed_decision: null, // mock/offline fallback -- no real audit data to derive this from
    status: statusMap[doc.status] ?? "pending_review",
    type: doc.type,
    uploaded_at: doc.uploaded_at,
    original_filename: doc.title,
    flags_count: doc.flags_count,
    replaces_document_id: doc.replaces_document_id,
    revision_notes: doc.revision_notes,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OfficerDashboardPage() {
  const { isReady } = useRequireAuth("officer");
  const { user } = useAuth();
  const router = useRouter();

  // Shell state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);
  const [activeView, setActiveView] = React.useState<OfficerView>("review_queue");

  // TA-118: Settings > Display -- "Collapse sidebar by default" and
  // "Compact rows", both read after mount so server-rendered and
  // first-client-render markup match.
  const [compactRows, setCompactRows] = React.useState(false);
  React.useEffect(() => {
    const s = loadSettings();
    if (s.sidebarCollapsed) setIsSidebarCollapsed(true);
    if (s.compactRows) setCompactRows(true);
  }, []);

  // Queue data
  const [documents, setDocuments] = React.useState<QueueTableRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [advisorFilter, setAdvisorFilter] = React.useState("all");
  const [sortBy, setSortBy] = React.useState("newest");
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Toast feedback with smooth slide enter & slide exit
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [isToastVisible, setIsToastVisible] = React.useState(false);
  const toastTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const toastExitTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const showToast = React.useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    if (toastExitTimeoutRef.current) clearTimeout(toastExitTimeoutRef.current);

    setToastMessage(msg);
    setIsToastVisible(false);

    requestAnimationFrame(() => {
      setIsToastVisible(true);
    });

    toastTimeoutRef.current = setTimeout(() => {
      setIsToastVisible(false);
      toastExitTimeoutRef.current = setTimeout(() => {
        setToastMessage(null);
      }, 500);
    }, 3800);
  }, []);

  // Keyboard shortcut: Ctrl+B to toggle sidebar
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        setIsSidebarCollapsed((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Load queue data (strictly pending reviews for the review queue dashboard)
  const loadQueue = React.useCallback(async () => {
    try {
      const data = await reviewsApi.getQueue("pending_review");
      setDocuments(
        data.map((d) => ({
          ...d,
          title: d.original_filename ?? `Document ${d.id.slice(0, 8)}`,
          advisor_viewed_decision: d.advisor_viewed_decision ?? null,
        }))
      );
      setError(null);
    } catch (err) {
      // A 401 means api-client already cleared the session and is
      // redirecting to /login (see setUnauthorizedHandler in
      // auth-context.tsx). That redirect is async, so without this
      // check the mock-data fallback below would render fake queue
      // rows on screen during the moment before navigation completes --
      // indistinguishable from real data to whoever's looking.
      if (err instanceof ApiError && err.status === 401) {
        return;
      }
      // Fallback to mock data when backend is offline
      if (err instanceof ApiError) {
        setError(err.message);
      }
      setDocuments(
        MOCK_QUEUE_DOCUMENTS.filter(
          (d) => d.status === "pending" || (d.status as string) === "pending_review"
        ).map(adaptMockToQueueRow)
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!isReady) return;
    let ignore = false;

    reviewsApi
      .getQueue("pending_review")
      .then((data) => {
        if (!ignore) {
          setDocuments(
            data.map((d) => ({
              ...d,
              title: d.original_filename ?? `Document ${d.id.slice(0, 8)}`,
              advisor_viewed_decision: d.advisor_viewed_decision ?? null,
            }))
          );
          setError(null);
        }
      })
      .catch((err) => {
        if (!ignore) {
          // See loadQueue's comment above: a 401 already triggered a
          // redirect to /login, so don't flash fake queue rows first.
          if (err instanceof ApiError && err.status === 401) {
            return;
          }
          if (err instanceof ApiError) {
            setError(err.message);
          }
          setDocuments(
            MOCK_QUEUE_DOCUMENTS.filter(
              (d) => d.status === "pending" || (d.status as string) === "pending_review"
            ).map(adaptMockToQueueRow)
          );
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [isReady]);

  // Refresh handler
  const handleRefresh = React.useCallback(async () => {
    setIsRefreshing(true);
    setIsLoading(true);
    await loadQueue();
    setIsRefreshing(false);
    showToast("Review operations data synchronized with repository.");
  }, [loadQueue, showToast]);

  // Filter and sort documents strictly for pending review queue
  // TA-94: populated from whatever advisors actually appear in the
  // current queue, rather than a hardcoded list -- stays correct as
  // advisors come and go, with no separate lookup needed.
  const advisorOptions = React.useMemo(() => {
    const names = Array.from(new Set(documents.map((d) => d.advisor_name))).sort();
    return [{ value: "all", label: "All Advisors" }, ...names.map((name) => ({ value: name, label: name }))];
  }, [documents]);

  const filteredDocuments = React.useMemo(() => {
    // All pending reviews appear in the review queue dashboard and nowhere else
    let result = documents.filter(
      (d) => d.status === "pending_review" || (d.status as string) === "pending"
    );

    // Document Type filter
    if (typeFilter !== "all") {
      result = result.filter((d) => d.type === typeFilter);
    }

    // Advisor filter (TA-94) -- combines with every other filter as AND
    if (advisorFilter !== "all") {
      result = result.filter((d) => d.advisor_name === advisorFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.advisor_name.toLowerCase().includes(q) ||
          d.id.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime();
        case "advisor":
          return a.advisor_name.localeCompare(b.advisor_name);
        case "newest":
        default:
          return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
      }
    });

    return result;
  }, [documents, typeFilter, advisorFilter, searchQuery, sortBy]);

  // Queue summary counts
  const queueCounts = React.useMemo(() => {
    const pendingDocs = documents.filter(
      (d) => d.status === "pending_review" || (d.status as string) === "pending"
    );
    const pending = pendingDocs.length;
    const highRisk = pendingDocs.filter((d) => (d.flags_count?.high ?? 0) > 0).length;
    return { pending, highRisk };
  }, [documents]);

  // Breadcrumbs
  const breadcrumbs = React.useMemo(() => {
    const viewLabels: Record<OfficerView, string> = {
      review_queue: "Review Queue",
      my_reviews: "My Reviews",
      metrics: "Metrics",
      audit_log: "Audit Log",
      settings: "Settings",
    };
    return [
      {
        label: "Workspace",
        href: "/officer",
        onClick: () => setActiveView("review_queue"),
      },
      { label: viewLabels[activeView] },
    ];
  }, [activeView]);

  if (!isReady) return null;

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-inter">
      {/* Toast Notification Container */}
      <div className="fixed top-5 right-5 z-50 pointer-events-none">
        {toastMessage && (
          <div
            className={cn(
              "flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-900/95 text-white text-xs shadow-xl border border-slate-700/50 backdrop-blur-md pointer-events-auto transition-all duration-300 transform",
              isToastVisible
                ? "opacity-100 translate-y-0 scale-100"
                : "opacity-0 -translate-y-3 scale-95"
            )}
          >
            <div className="h-2 w-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
            <span className="font-normal font-inter tracking-wide">{toastMessage}</span>
            <button
              onClick={() => setIsToastVisible(false)}
              className="ml-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Officer Navigation Sidebar */}
      <OfficerSidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        activeView={activeView}
        onSelectView={setActiveView}
        userName={user?.name}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          breadcrumbs={breadcrumbs}
          onToggleMobileSidebar={() => setMobileSidebarOpen(true)}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />

        <main className="flex-1 overflow-y-auto">
          {activeView === "review_queue" && (
            <div className="p-5 sm:p-7 lg:p-8 max-w-[1400px] w-full mx-auto">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white font-inter">
                    Review Queue
                  </h1>
                </div>

                {/* Queue pill indicators */}
                <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 font-inter shadow-2xs self-start sm:self-auto">
                  <span className="flex items-center gap-1">
                    <span className="font-numbers tabular-nums font-semibold text-slate-800 dark:text-slate-100">
                      {queueCounts.pending}
                    </span>{" "}
                    pending
                  </span>
                  {queueCounts.highRisk > 0 && (
                    <>
                      <span className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-[#92400e] dark:text-amber-400" />
                        <span className="font-numbers tabular-nums text-[#92400e] dark:text-amber-400 font-medium">
                          {queueCounts.highRisk}
                        </span>{" "}
                        high risk
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Filters Row */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
                {/* Search Input */}
                <div className="relative flex-1 max-w-sm">
                  <label htmlFor="officer-queue-search" className="sr-only">
                    Search pending documents, advisors, or IDs
                  </label>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
                  <input
                    id="officer-queue-search"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search pending documents, advisors, or IDs..."
                    aria-label="Search pending documents, advisors, or IDs"
                    className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 font-inter transition-all focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[#1e4c77] dark:focus:ring-[#7fb2e3]/40 focus:bg-white dark:focus:bg-slate-800"
                  />
                </div>

                {/* Document Type Filter */}
                <div className="relative">
                  <label htmlFor="officer-type-filter" className="sr-only">
                    Filter by document type
                  </label>
                  <select
                    id="officer-type-filter"
                    name="type"
                    aria-label="Filter by document type"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="h-9 pl-3 pr-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 font-inter appearance-none cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-[#1e4c77] dark:focus:ring-[#7fb2e3]/40 focus:border-transparent transition-all"
                  >
                    {TYPE_FILTERS.map((f) => (
                      <option key={f.value} value={f.value} className="dark:bg-slate-800 dark:text-slate-100">
                        {f.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
                </div>

                {/* Advisor Filter (TA-94) */}
                <div className="relative">
                  <label htmlFor="officer-advisor-filter" className="sr-only">
                    Filter by advisor
                  </label>
                  <select
                    id="officer-advisor-filter"
                    name="advisor"
                    aria-label="Filter by advisor"
                    value={advisorFilter}
                    onChange={(e) => setAdvisorFilter(e.target.value)}
                    className="h-9 pl-3 pr-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 font-inter appearance-none cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-[#1e4c77] dark:focus:ring-[#7fb2e3]/40 focus:border-transparent transition-all"
                  >
                    {advisorOptions.map((a) => (
                      <option key={a.value} value={a.value} className="dark:bg-slate-800 dark:text-slate-100">
                        {a.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
                </div>

                {/* Sort */}
                <div className="relative">
                  <label htmlFor="officer-sort-by" className="sr-only">
                    Sort reviews
                  </label>
                  <select
                    id="officer-sort-by"
                    name="sort"
                    aria-label="Sort reviews"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="h-9 pl-3 pr-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 font-inter appearance-none cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-[#1e4c77] dark:focus:ring-[#7fb2e3]/40 focus:border-transparent transition-all"
                  >
                    {SORT_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value} className="dark:bg-slate-800 dark:text-slate-100">
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
                </div>
              </div>

              {/* Error Banner */}
              {error && (
                <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs text-rose-700 dark:text-rose-300 mb-4 font-inter">
                  {error}{" "}
                  <button
                    onClick={handleRefresh}
                    className="underline text-rose-900 dark:text-rose-200 hover:text-rose-700 dark:hover:text-rose-100 font-medium cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Queue Table */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
                {isLoading ? (
                  // Loading skeleton
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-4 px-4 py-4">
                        <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 w-48 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                          <div className="h-2.5 w-32 bg-slate-50 dark:bg-slate-800/60 rounded animate-pulse" />
                        </div>
                        <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                        <div className="h-3 w-16 bg-slate-50 dark:bg-slate-800/60 rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : filteredDocuments.length === 0 ? (
                  // Empty state
                  <div className="p-12 text-center">
                    <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto mb-3">
                      <Inbox className="h-5 w-5" />
                    </div>
                    {documents.length === 0 ? (
                      <>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 font-inter">
                          All caught up!
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-300 mt-1 max-w-sm mx-auto font-inter">
                          There are no pending submissions in the review queue.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 font-inter">
                          No matching submissions
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-300 mt-1 font-inter">
                          Try adjusting your search query or filters.
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  // Real Table
                  <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-inter">
                        <th className="text-left py-3 px-4 text-[12px] font-normal text-slate-500 dark:text-slate-400 tracking-normal">
                          Document
                        </th>
                        <th className="text-left py-3 px-4 text-[12px] font-normal text-slate-500 dark:text-slate-400 tracking-normal">
                          Advisor
                        </th>
                        <th className="text-left py-3 px-4 text-[12px] font-normal text-slate-500 dark:text-slate-400 tracking-normal">
                          Status
                        </th>
                        <th className="text-left py-3 px-4 text-[12px] font-normal text-slate-500 dark:text-slate-400 tracking-normal">
                          Type
                        </th>
                        <th className="text-right py-3 px-4 text-[12px] font-normal text-slate-500 dark:text-slate-400 tracking-normal">
                          Submitted
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredDocuments.map((doc) => {
                        const days = daysInQueue(doc.uploaded_at);

                        return (
                          <tr
                            key={doc.id}
                            onClick={() => router.push(`/officer/documents/${doc.id}`)}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                          >
                            {/* Document Name & ID */}
                            <td className={cn("px-4", compactRows ? "py-1.5" : "py-3.5")}>
                              <div className="flex items-center gap-3 min-w-0">
                                <FileTypeIcon
                                  filename={doc.original_filename ?? doc.title}
                                  type={doc.type as "pdf" | "docx" | "xlsx"}
                                  size="sm"
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-[13px] font-normal text-slate-800 dark:text-slate-200 truncate max-w-[260px] font-inter">
                                      {doc.title}
                                    </p>
                                    {(doc.replaces_document_id || doc.revision_notes) && (
                                      <span className="rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 px-1.5 py-0.5 text-[10px] font-medium text-[#1e4c77] dark:text-[#7fb2e3] shrink-0 font-inter">
                                        Revision
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Advisor */}
                            <td className={cn("px-4 text-[13px] text-slate-600 dark:text-slate-300 font-inter font-normal", compactRows ? "py-1.5" : "py-3.5")}>
                              {doc.advisor_name}
                            </td>

                            {/* Status (TA-66) */}
                            <td className={cn("px-4 whitespace-nowrap", compactRows ? "py-1.5" : "py-3.5")}>
                              <StatusBadge status={doc.status} />
                              {doc.advisor_viewed_decision !== null && (
                                <div
                                  className={cn(
                                    "flex items-center gap-1 mt-1 text-[10px] font-inter",
                                    doc.advisor_viewed_decision ? "text-slate-500 dark:text-slate-300" : "text-[#1e4c77] dark:text-[#7fb2e3]"
                                  )}
                                >
                                  {doc.advisor_viewed_decision ? (
                                    <>
                                      <Eye className="h-2.5 w-2.5" />
                                      <span>Seen by advisor</span>
                                    </>
                                  ) : (
                                    <>
                                      <EyeOff className="h-2.5 w-2.5" />
                                      <span>Not seen yet</span>
                                    </>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Type */}
                            <td className={cn("px-4 text-[13px] text-slate-500 dark:text-slate-400 font-inter font-normal", compactRows ? "py-1.5" : "py-3.5")}>
                              {doc.type}
                            </td>

                            {/* Submitted */}
                            <td className={cn("px-4", compactRows ? "py-1.5" : "py-3.5")}>
                              <div className="text-right">
                                <p className="text-[12px] text-slate-500 dark:text-slate-400 font-inter">
                                  {formatRelativeDate(doc.uploaded_at)}
                                </p>
                                {days > 0 && doc.status === "pending_review" && (
                                  <p
                                    className={cn(
                                      "text-[10px] mt-0.5 font-numbers tabular-nums",
                                      days >= 3 ? "text-[#92400e] dark:text-amber-400" : "text-slate-500 dark:text-slate-300"
                                    )}
                                  >
                                    {days}d in queue
                                  </p>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
                )}
              </div>

              {/* Results count */}
              {!isLoading && filteredDocuments.length > 0 && (
                <p className="text-[11px] text-slate-500 dark:text-slate-300 mt-3 font-inter">
                  Showing{" "}
                  <span className="font-numbers tabular-nums font-medium text-slate-700 dark:text-slate-200">
                    {filteredDocuments.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-numbers tabular-nums font-medium text-slate-700 dark:text-slate-200">
                    {documents.length}
                  </span>{" "}
                  submissions
                </p>
              )}
            </div>
          )}

          {activeView === "my_reviews" && (
            <div className="p-5 sm:p-7 lg:p-8 max-w-[1400px] w-full mx-auto">
              <OfficerMyReviewsView onShowToast={showToast} />
            </div>
          )}

          {activeView === "metrics" && (
            <div className="p-5 sm:p-7 lg:p-8 max-w-[1400px] w-full mx-auto">
              <OfficerMetricsView onShowToast={showToast} />
            </div>
          )}

          {activeView === "audit_log" && (
            <div className="p-5 sm:p-7 lg:p-8 max-w-[1400px] w-full mx-auto">
              <OfficerAuditLogView onShowToast={showToast} />
            </div>
          )}

          {activeView === "settings" && (
            <div className="p-5 sm:p-7 lg:p-8 max-w-[1400px] w-full mx-auto">
              <SettingsView />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
