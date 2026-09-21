"use client";

import * as React from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { MetricCards } from "@/components/advisor/metric-cards";
import { SubmissionsTable } from "@/components/advisor/submissions-table";
import { RecentActivity } from "@/components/advisor/recent-activity";
import { DocumentInspectorDrawer } from "@/components/advisor/document-inspector-drawer";
import { NewSubmissionView } from "@/components/advisor/new-submission-view";
import { MetricsDashboardView } from "@/components/analytics/metrics-dashboard-view";
import { RevisionUploadModal } from "@/components/advisor/revision-upload-modal";
import { SettingsView } from "@/components/common/settings-view";
import { ComplianceDocument } from "@/types/compliance";
import { Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRequireAuth } from "@/lib/use-require-auth";
import { useAuth } from "@/lib/auth-context";
import { documentsApi, type BackendDocument } from "@/lib/documents-api";
import { adaptBackendDocument } from "@/lib/document-adapter";
import { classifyError, logDiagnosticError } from "@/lib/error-utils";
import { loadSettings } from "@/lib/user-settings";

/**
 * Returns a time-of-day greeting that updates every minute so the
 * salutation stays accurate even if the page is left open all day.
 *
 *   before 12:00  → "Good morning"
 *   12:00–16:59   → "Good afternoon"
 *   17:00+        → "Good evening"
 */
function useGreeting(): string {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const [greeting, setGreeting] = React.useState(getGreeting);

  React.useEffect(() => {
    // Re-evaluate every 60 seconds so the greeting transitions naturally
    const id = setInterval(() => setGreeting(getGreeting()), 60_000);
    return () => clearInterval(id);
  }, []);

  return greeting;
}

export default function AdvisorDashboardPage() {
  // TA-61: unauthenticated visitors redirected to /login; an
  // authenticated officer landing here gets sent to their own
  // dashboard instead.
  const { isReady } = useRequireAuth("advisor");
  const { user } = useAuth();
  const greeting = useGreeting();
  // Extract first name from the authenticated user, fallback to "there"
  const firstName = user?.name?.split(" ")[0] || "there";

  // Sidebar states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);

  // TA-118: Settings > Display > "Collapse sidebar by default" -- read
  // after mount (not as the useState initializer) so server-rendered
  // and first-client-render markup match; the sidebar then snaps to the
  // saved preference a frame later, same tradeoff the dark-mode toggle
  // itself accepts everywhere except the flash-prevention <script> in
  // layout.tsx.
  React.useEffect(() => {
    if (loadSettings().sidebarCollapsed) setIsSidebarCollapsed(true);
  }, []);
  const [activeView, setActiveView] = React.useState<
    "overview" | "my_submissions" | "new_submission" | "history" | "metrics" | "settings"
  >("overview");

  // TA-63: real documents, fetched from the backend -- not mock data.
  const [documents, setDocuments] = React.useState<ComplianceDocument[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const loadDocuments = React.useCallback(async () => {
    setLoadError(null);
    try {
      const backendDocs = await documentsApi.list();
      const adapted = backendDocs.map((d) => adaptBackendDocument(d, "You", ""));
      setDocuments(adapted);
    } catch (err) {
      logDiagnosticError("AdvisorDashboardPage.loadDocuments", err);
      setDocuments([]);
      setLoadError(classifyError(err));
    } finally {
      setIsLoadingDocuments(false);
    }
  }, []);

  React.useEffect(() => {
    if (isReady) {
      loadDocuments();
    }
  }, [isReady, loadDocuments]);

  // Table filtering and search states
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [sortBy, setSortBy] = React.useState<"newest" | "oldest" | "title">("newest");

  // Refresh indicator state
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Modal and drawer states
  const [selectedDocument, setSelectedDocument] = React.useState<ComplianceDocument | null>(null);
  const [revisionDoc, setRevisionDoc] = React.useState<ComplianceDocument | null>(null);

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

    // Trigger enter animation smoothly on next animation frame
    requestAnimationFrame(() => {
      setIsToastVisible(true);
    });

    // Reading duration: comfortable & professional (3.8s), then slides back to right edge
    toastTimeoutRef.current = setTimeout(() => {
      setIsToastVisible(false);
      toastExitTimeoutRef.current = setTimeout(() => {
        setToastMessage(null);
      }, 500);
    }, 3800);
  }, []);

  React.useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      if (toastExitTimeoutRef.current) clearTimeout(toastExitTimeoutRef.current);
    };
  }, []);

  // Global keyboard shortcut: Ctrl+B / Cmd+B to toggle sidebar
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setIsSidebarCollapsed((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // A needs_revision document that's already been superseded by its own
  // revision keeps that status forever as a historical record (the
  // backend's replaces_document_id chain, not a mutation) -- it must not
  // still count or act as something the advisor needs to act on.
  const supersededDocumentIds = React.useMemo(
    () => new Set(documents.filter((d) => d.replaces_document_id).map((d) => d.replaces_document_id as string)),
    [documents]
  );

  // Compute metric counts matching the user's sketch (Total: 6, Pending: 2, Approved: 2, Needs Revision: 1)
  const metricCounts = React.useMemo(() => {
    const total = documents.length;
    const pending = documents.filter(
      (d) => d.status === "pending" || d.status === "in_review"
    ).length;
    const approved = documents.filter((d) => d.status === "approved").length;
    const needsRevision = documents.filter(
      (d) => d.status === "needs_revision" && !supersededDocumentIds.has(d.id)
    ).length;
    const rejected = documents.filter((d) => d.status === "rejected").length;

    return { total, pending, approved, needsRevision, rejected };
  }, [documents, supersededDocumentIds]);

  // TA-63: real refresh -- re-fetches from the backend, not a fake delay.
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDocuments();
    setIsRefreshing(false);
    showToast("Submissions synced with Compliance Repository");
  };

  // TA-63: receives the REAL backend response from a real upload
  // (NewSubmissionModal's onSubmit), or client-side submission data
  const handleNewSubmission = (uploaded: BackendDocument | Partial<ComplianceDocument>) => {
    if ("original_filename" in uploaded && uploaded.id) {
      const newDoc = adaptBackendDocument(uploaded as BackendDocument, "You", "");
      setDocuments((prev) => [newDoc, ...prev.filter((d) => d.id !== newDoc.id)]);
      showToast(`"${newDoc.title}" submitted for compliance review.`);
      void loadDocuments();
    }
  };

  // Handle revision upload
  // TA-65: receives the REAL backend response -- a genuinely NEW
  // document row (its own id, status=pending_review), not a mutation
  // of the original. The original correctly keeps its own real
  // historical status (needs_revision) -- that's what
  // replaces_document_id / thread linkage represents.
  const handleRevisionSubmit = (uploaded: BackendDocument) => {
    const newDoc = adaptBackendDocument(uploaded, "You", "");
    setDocuments((prev) => [newDoc, ...prev.filter((d) => d.id !== newDoc.id)]);
    showToast(`Version submitted -- now pending review.`);
    void loadDocuments();
  };

  if (!isReady) {
    return null;
  }


  return (
    <div className="flex min-h-screen w-full bg-[#f8fafc] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-inter">
      {/* Restructured Sidebar matching Image 3 (Handwritten sketch) */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onNewSubmissionClick={() => setActiveView("new_submission")}
        onHistoryClick={() => {
          const el = document.getElementById("recent-activity-section");
          el?.scrollIntoView({ behavior: "smooth" });
        }}
        onMetricsClick={() => {
          const el = document.getElementById("metric-cards-section");
          el?.scrollIntoView({ behavior: "smooth" });
        }}
        activeView={activeView}
        onSelectView={(v) => {
          setActiveView(v);
          if (v === "my_submissions" || v === "overview") {
            const el = document.getElementById("submissions-table-section");
            el?.scrollIntoView({ behavior: "smooth" });
          } else if (v === "history") {
            const el = document.getElementById("recent-activity-section");
            el?.scrollIntoView({ behavior: "smooth" });
          } else if (v === "metrics") {
            const el = document.getElementById("metric-cards-section");
            el?.scrollIntoView({ behavior: "smooth" });
          }
        }}
        userName={user?.name}
      />

      {/* Main Workspace Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Fixed Reusable Top Bar — Taller vertically, larger buttons */}
        <TopBar
          breadcrumbs={[
            {
              label: "Workspace",
              href: "/advisor",
              onClick: () => setActiveView("overview"),
            },
            {
              label:
                activeView === "overview"
                  ? "Overview"
                  : activeView === "my_submissions"
                  ? "My Submissions"
                  : activeView === "new_submission"
                  ? "New Submission"
                  : activeView === "history"
                  ? "History"
                  : activeView === "metrics"
                  ? "Metrics"
                  : activeView === "settings"
                  ? "Settings"
                  : "Overview",
            },
          ]}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onToggleMobileSidebar={() => setMobileSidebarOpen(true)}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          onNotificationClick={(documentId) => {
            const target = documents.find((d) => d.id === documentId);
            if (target) setSelectedDocument(target);
          }}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 p-5 sm:p-7 lg:p-8 max-w-[1400px] w-full mx-auto space-y-6 font-inter">
          {/* VIEW 1: GENERAL OVERVIEW DASHBOARD */}
          {activeView === "overview" && (
            <>
              {/* Top Salutation — Big elegant non-bold Inter font with Advisor name */}
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-[46px] font-normal text-slate-800 dark:text-slate-100 tracking-tight font-inter leading-tight">
                  {greeting}, {firstName}.
                </h1>
              </div>

              {/* 5 Summary Metric Cards (Clicking one opens My Submissions with that filter) */}
              <div id="metric-cards-section">
                <MetricCards
                  total={metricCounts.total}
                  pending={metricCounts.pending}
                  approved={metricCounts.approved}
                  needsRevision={metricCounts.needsRevision}
                  rejected={metricCounts.rejected}
                  activeFilter={statusFilter}
                  hasError={Boolean(loadError)}
                  onSelectFilter={(filterKey) => {
                    setStatusFilter(filterKey);
                    setActiveView("my_submissions");
                  }}
                />
              </div>

              {/* General Overview Recent Submissions: exactly 5 items, no search/filter clutter, with "More" link */}
              <div id="submissions-table-section">
                <SubmissionsTable
                  variant="overview"
                  onViewMore={() => setActiveView("my_submissions")}
                  documents={documents}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                  sortBy={sortBy}
                  onSortByChange={setSortBy}
                  onSelectDocument={(doc) => setSelectedDocument(doc)}
                  onReviseClick={(doc) => setRevisionDoc(doc)}
                  isLoading={isLoadingDocuments}
                  loadError={loadError}
                  onRetry={loadDocuments}
                  onResetFilters={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                />
              </div>

              {/* Recent Activity Feed Section */}
              <div id="recent-activity-section">
                <RecentActivity
                  documents={documents}
                  loadError={loadError}
                  isLoading={isLoadingDocuments}
                  onRetry={loadDocuments}
                  onViewAllClick={() => {
                    setActiveView("history");
                  }}
                  onItemClick={(docId) => {
                    const target = documents.find((d) => d.id === docId);
                    if (target) setSelectedDocument(target);
                  }}
                />
              </div>
            </>
          )}

          {/* VIEW 2: DEDICATED MY SUBMISSIONS DASHBOARD */}
          {activeView === "my_submissions" && (
            <>
              {/* Dedicated Submissions Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-normal text-slate-800 dark:text-slate-100 tracking-tight font-inter leading-tight">
                    My Submissions
                  </h1>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveView("new_submission")}
                  className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-[#1e4c77] hover:bg-[#163e63] active:bg-[#112f4c] text-white text-xs font-normal font-inter transition-all shadow-xs cursor-pointer self-start sm:self-auto shrink-0"
                >
                  <Plus className="h-4 w-4 stroke-[1.8]" />
                  <span>New Submission</span>
                </button>
              </div>

              {/* Dedicated Submissions Table with all filters, search with theme gradient border, sort, status */}
              <div id="submissions-table-section">
                <SubmissionsTable
                  variant="full"
                  documents={documents}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                  sortBy={sortBy}
                  onSortByChange={setSortBy}
                  onSelectDocument={(doc) => setSelectedDocument(doc)}
                  onReviseClick={(doc) => setRevisionDoc(doc)}
                  isLoading={isLoadingDocuments}
                  loadError={loadError}
                  onRetry={loadDocuments}
                  onResetFilters={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                />
              </div>
            </>
          )}

          {/* VIEW 3: HISTORY VIEW */}
          {activeView === "history" && (
            <div className="space-y-6">
              {/* Dedicated History Header matching My Submissions header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-normal text-slate-800 dark:text-slate-100 tracking-tight font-inter leading-tight">
                    Submission &amp; Review History
                  </h1>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveView("new_submission")}
                  className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-[#1e4c77] hover:bg-[#163e63] active:bg-[#112f4c] text-white text-xs font-normal font-inter transition-all shadow-xs cursor-pointer self-start sm:self-auto shrink-0"
                >
                  <Plus className="h-4 w-4 stroke-[1.8]" />
                  <span>New Submission</span>
                </button>
              </div>

              <RecentActivity
                documents={documents}
                isFullHistory={true}
                loadError={loadError}
                isLoading={isLoadingDocuments}
                onRetry={loadDocuments}
                onItemClick={(docId) => {
                  const target = documents.find((d) => d.id === docId);
                  if (target) setSelectedDocument(target);
                }}
              />
            </div>
          )}

          {/* VIEW 4: METRICS & ANALYTICS DASHBOARD */}
          {activeView === "metrics" && (
            <MetricsDashboardView
              documents={documents}
              onShowToast={showToast}
            />
          )}

          {/* VIEW 5: DEDICATED NEW SUBMISSION WORKSPACE */}
          {activeView === "new_submission" && (
            <NewSubmissionView
              onSubmit={(newDocData) => {
                handleNewSubmission(newDocData);
                setActiveView("my_submissions");
              }}
              onCancel={() => setActiveView("overview")}
            />
          )}

          {/* VIEW 6: SETTINGS */}
          {activeView === "settings" && (
            <SettingsView />
          )}
        </main>
      </div>

      {/* Slide-over Inspector Drawer for Selected Document */}
      <DocumentInspectorDrawer
        document={selectedDocument}
        isSuperseded={selectedDocument ? supersededDocumentIds.has(selectedDocument.id) : false}
        onClose={() => setSelectedDocument(null)}
        onReviseClick={(doc) => {
          setSelectedDocument(null);
          setRevisionDoc(doc);
        }}
      />

      {/* Revision Resubmission Modal */}
      <RevisionUploadModal
        document={revisionDoc}
        isOpen={!!revisionDoc}
        onClose={() => setRevisionDoc(null)}
        onSubmitRevision={handleRevisionSubmit}
      />

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
