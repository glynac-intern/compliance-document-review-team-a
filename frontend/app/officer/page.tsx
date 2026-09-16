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
import { reviewsApi, type QueueDocument } from "@/lib/reviews-api";
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "pending_review", label: "Pending Review" },
  { value: "needs_revision", label: "Needs Revision" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

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
  { value: "risk", label: "Risk Priority" },
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

function getTotalFlags(doc: QueueDocument & { flags_count?: { high: number; medium: number; low: number } }): number {
  if (!doc.flags_count) return 0;
  return doc.flags_count.high + doc.flags_count.medium + doc.flags_count.low;
}

function getHighFlags(doc: QueueDocument & { flags_count?: { high: number; medium: number; low: number } }): number {
  return doc.flags_count?.high ?? 0;
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
  const router = useRouter();

  // Shell state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);
  const [activeView, setActiveView] = React.useState<OfficerView>("review_queue");

  // Queue data
  const [documents, setDocuments] = React.useState<QueueTableRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
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

  // Load queue data
  const loadQueue = React.useCallback(async () => {
    try {
      const data = await reviewsApi.getQueue();
      setDocuments(
        data.map((d) => ({
          ...d,
          title: d.original_filename ?? `Document ${d.id.slice(0, 8)}`,
        }))
      );
      setError(null);
    } catch (err) {
      // Fallback to mock data when backend is offline
      if (err instanceof ApiError) {
        setError(err.message);
      }
      setDocuments(MOCK_QUEUE_DOCUMENTS.map(adaptMockToQueueRow));
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!isReady) return;
    let ignore = false;

    reviewsApi
      .getQueue()
      .then((data) => {
        if (!ignore) {
          setDocuments(
            data.map((d) => ({
              ...d,
              title: d.original_filename ?? `Document ${d.id.slice(0, 8)}`,
            }))
          );
          setError(null);
        }
      })
      .catch((err) => {
        if (!ignore) {
          if (err instanceof ApiError) {
            setError(err.message);
          }
          setDocuments(MOCK_QUEUE_DOCUMENTS.map(adaptMockToQueueRow));
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

  // Filter and sort documents strictly for pending review queue or selected status
  // TA-94: populated from whatever advisors actually appear in the
  // current queue, rather than a hardcoded list -- stays correct as
  // advisors come and go, with no separate lookup needed.
  const advisorOptions = React.useMemo(() => {
    const names = Array.from(new Set(documents.map((d) => d.advisor_name))).sort();
    return [{ value: "all", label: "All Advisors" }, ...names.map((name) => ({ value: name, label: name }))];
  }, [documents]);

  const filteredDocuments = React.useMemo(() => {
    let result = [...documents];

    // Status filter (TA-66)
    if (statusFilter !== "all") {
      result = result.filter((d) => {
        if (statusFilter === "pending_review") {
          return d.status === "pending_review" || (d.status as string) === "pending";
        }
        return d.status === statusFilter;
      });
    }

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
        case "risk":
          return getHighFlags(b as never) - getHighFlags(a as never) || getTotalFlags(b as never) - getTotalFlags(a as never);
        case "advisor":
          return a.advisor_name.localeCompare(b.advisor_name);
        case "newest":
        default:
          return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
      }
    });

    return result;
  }, [documents, statusFilter, typeFilter, advisorFilter, searchQuery, sortBy]);

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
    };
    return [
      {
        label: "Workspace",
        onClick: () => setActiveView("review_queue"),
      },
      { label: viewLabels[activeView] },
    ];
  }, [activeView]);

  if (!isReady) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-inter">
      {/* Officer Sidebar */}
      <OfficerSidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        activeView={activeView}
        onSelectView={setActiveView}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TopBar */}
        <TopBar
          breadcrumbs={breadcrumbs}
          onToggleMobileSidebar={() => setMobileSidebarOpen(true)}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {activeView === "review_queue" && (
            <div className="p-5 sm:p-8">
              {/* Queue Summary Strip */}
              <div className="flex items-baseline gap-6 mb-6">
                <h1 className="text-[15px] font-medium text-slate-900 font-inter">
                  Review Queue
                </h1>
                <div className="flex items-center gap-4 text-xs text-slate-400 font-inter">
                  <span>
                    <span className="font-numbers tabular-nums text-slate-600 font-medium">
                      {queueCounts.pending}
                    </span>{" "}
                    awaiting review
                  </span>
                  {queueCounts.highRisk > 0 && (
                    <>
                      <span className="h-3 w-px bg-slate-200" />
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-[#92400e]" />
                        <span className="font-numbers tabular-nums text-[#92400e] font-medium">
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
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search pending documents, advisors, or IDs..."
                    className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 font-inter transition-all focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[#1e4c77] focus:bg-white"
                  />
                </div>

                {/* Status Filter (TA-66) */}
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-9 pl-3 pr-8 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 font-inter appearance-none cursor-pointer hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1e4c77] focus:border-transparent transition-all"
                  >
                    {STATUS_FILTERS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>

                {/* Document Type Filter */}
                <div className="relative">
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="h-9 pl-3 pr-8 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 font-inter appearance-none cursor-pointer hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1e4c77] focus:border-transparent transition-all"
                  >
                    {TYPE_FILTERS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>

                {/* Advisor Filter (TA-94) */}
                <div className="relative">
                  <select
                    value={advisorFilter}
                    onChange={(e) => setAdvisorFilter(e.target.value)}
                    className="h-9 pl-3 pr-8 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 font-inter appearance-none cursor-pointer hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1e4c77] focus:border-transparent transition-all"
                  >
                    {advisorOptions.map((a) => (
                      <option key={a.value} value={a.value}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>

                {/* Sort */}
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="h-9 pl-3 pr-8 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 font-inter appearance-none cursor-pointer hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1e4c77] focus:border-transparent transition-all"
                  >
                    {SORT_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Error Banner */}
              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 mb-4 font-inter">
                  {error}{" "}
                  <button
                    onClick={handleRefresh}
                    className="underline text-rose-900 hover:text-rose-700 font-medium cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Queue Table */}
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                {isLoading ? (
                  // Loading skeleton
                  <div className="divide-y divide-slate-100">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-4 px-4 py-4">
                        <div className="h-8 w-8 rounded-lg bg-slate-100 animate-pulse" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 w-48 bg-slate-100 rounded animate-pulse" />
                          <div className="h-2.5 w-32 bg-slate-50 rounded animate-pulse" />
                        </div>
                        <div className="h-3 w-20 bg-slate-100 rounded animate-pulse" />
                        <div className="h-3 w-16 bg-slate-50 rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : filteredDocuments.length === 0 ? (
                  // Empty state
                  <div className="p-12 text-center">
                    <div className="h-10 w-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                      <Inbox className="h-5 w-5" />
                    </div>
                    {documents.length === 0 ? (
                      <>
                        <p className="text-sm font-medium text-slate-800 font-inter">
                          Queue is empty
                        </p>
                        <p className="text-xs text-slate-400 mt-1 font-inter">
                          No documents have been submitted for review yet.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-slate-800 font-inter">
                          No documents match
                        </p>
                        <p className="text-xs text-slate-400 mt-1 font-inter">
                          <span className="font-numbers tabular-nums">{documents.length}</span>{" "}
                          document{documents.length !== 1 ? "s" : ""} in queue — try adjusting
                          your filters.
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <table className="w-full text-xs font-inter">
                    <thead>
                      <tr className="bg-[#f8fafc]/90 border-b border-slate-100">
                        <th className="text-left py-3 px-4 text-[12px] font-normal text-slate-400 tracking-normal">
                          Document Name & ID
                        </th>
                        <th className="text-left py-3 px-4 text-[12px] font-normal text-slate-400 tracking-normal">
                          Advisor
                        </th>
                        <th className="text-left py-3 px-4 text-[12px] font-normal text-slate-400 tracking-normal">
                          Status
                        </th>
                        <th className="text-left py-3 px-4 text-[12px] font-normal text-slate-400 tracking-normal">
                          Type
                        </th>
                        <th className="text-left py-3 px-4 text-[12px] font-normal text-slate-400 tracking-normal">
                          Risk
                        </th>
                        <th className="text-right py-3 px-4 text-[12px] font-normal text-slate-400 tracking-normal">
                          Submitted
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredDocuments.map((doc) => {
                        const highCount = doc.flags_count?.high ?? 0;
                        const medCount = doc.flags_count?.medium ?? 0;
                        const lowCount = doc.flags_count?.low ?? 0;
                        const totalFlags = highCount + medCount + lowCount;
                        const days = daysInQueue(doc.uploaded_at);

                        return (
                          <tr
                            key={doc.id}
                            onClick={() => router.push(`/officer/documents/${doc.id}`)}
                            className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                          >
                            {/* Document Name & ID */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3 min-w-0">
                                <FileTypeIcon
                                  filename={doc.original_filename ?? doc.title}
                                  type={doc.type as "pdf" | "docx" | "xlsx"}
                                  size="sm"
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-[13px] font-normal text-slate-800 truncate max-w-[260px] font-inter">
                                      {doc.title}
                                    </p>
                                    {(doc.replaces_document_id || doc.revision_notes) && (
                                      <span className="rounded-md bg-blue-50 border border-blue-200/80 px-1.5 py-0.5 text-[10px] font-medium text-[#1e4c77] shrink-0 font-inter">
                                        Revision
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-400 font-numbers tabular-nums mt-0.5">
                                    {doc.id}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Advisor */}
                            <td className="py-3.5 px-4 text-[13px] text-slate-600 font-inter font-normal">
                              {doc.advisor_name}
                            </td>

                            {/* Status (TA-66) */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <StatusBadge status={doc.status} />
                              {doc.advisor_viewed_decision !== null && (
                                <div
                                  className={cn(
                                    "flex items-center gap-1 mt-1 text-[10px] font-inter",
                                    doc.advisor_viewed_decision ? "text-slate-400" : "text-[#1e4c77]"
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
                            <td className="py-3.5 px-4 text-[13px] text-slate-500 font-inter font-normal">
                              {doc.type}
                            </td>

                            {/* Risk Flags */}
                            <td className="py-3.5 px-4">
                              {totalFlags > 0 ? (
                                <div className="flex items-center gap-1.5">
                                  {highCount > 0 && (
                                    <span className="text-[11px] font-medium text-[#991b1b] font-numbers tabular-nums">
                                      {highCount}H
                                    </span>
                                  )}
                                  {medCount > 0 && (
                                    <span className="text-[11px] font-medium text-[#92400e] font-numbers tabular-nums">
                                      {medCount}M
                                    </span>
                                  )}
                                  {lowCount > 0 && (
                                    <span className="text-[11px] font-medium text-[#1e4c77] font-numbers tabular-nums">
                                      {lowCount}L
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-300 font-inter">—</span>
                              )}
                            </td>

                            {/* Submitted */}
                            <td className="py-3.5 px-4">
                              <div className="text-right">
                                <p className="text-[12px] text-slate-500 font-inter">
                                  {formatRelativeDate(doc.uploaded_at)}
                                </p>
                                {days > 0 && doc.status === "pending_review" && (
                                  <p
                                    className={cn(
                                      "text-[10px] mt-0.5 font-numbers tabular-nums",
                                      days >= 3 ? "text-[#92400e]" : "text-slate-400"
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
                )}
              </div>

              {/* Results count */}
              {!isLoading && filteredDocuments.length > 0 && (
                <p className="text-[11px] text-slate-400 mt-3 font-inter">
                  Showing{" "}
                  <span className="font-numbers tabular-nums font-medium text-slate-500">
                    {filteredDocuments.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-numbers tabular-nums font-medium text-slate-500">
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
        </main>
      </div>

      {/* Toast Notification Container — Elegant slide-in from right edge and slide-back exit */}
      {toastMessage && (
        <div className="fixed bottom-6 right-0 z-50 pointer-events-none px-6 overflow-hidden">
          <div
            className={cn(
              "pointer-events-auto flex items-center gap-3 rounded-2xl bg-[#1e4c77] text-white px-5 py-3.5 shadow-[0_16px_36px_-6px_rgba(20,55,88,0.5)] border border-white/20 font-inter select-none",
              "transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
              isToastVisible
                ? "translate-x-0 opacity-100"
                : "translate-x-full opacity-0"
            )}
          >
            <div className="h-5 w-5 rounded-full bg-white/20 flex items-center justify-center shrink-0 border border-white/25">
              <Check className="h-3 w-3 text-white stroke-[2.8]" />
            </div>
            <span className="font-inter text-xs sm:text-[13px] font-medium text-white tracking-normal whitespace-nowrap">
              {toastMessage}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
