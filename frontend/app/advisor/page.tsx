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
import { CertificateModal } from "@/components/advisor/certificate-modal";
import { ComplianceDocument } from "@/types/compliance";
import { Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRequireAuth } from "@/lib/use-require-auth";
import { documentsApi, type BackendDocument } from "@/lib/documents-api";
import { adaptBackendDocument } from "@/lib/document-adapter";
import { ApiError } from "@/lib/api-client";

export default function AdvisorDashboardPage() {
  // TA-61: unauthenticated visitors redirected to /login; an
  // authenticated officer landing here gets sent to their own
  // dashboard instead.
  const { isReady } = useRequireAuth("advisor");

  // Sidebar states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);
  const [activeView, setActiveView] = React.useState<
    "overview" | "my_submissions" | "new_submission" | "history" | "metrics"
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
      setLoadError(err instanceof ApiError ? err.message : "Unable to load your submissions.");
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
  const [certificateDoc, setCertificateDoc] = React.useState<ComplianceDocument | null>(null);

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

  // Compute metric counts matching the user's sketch (Total: 6, Pending: 2, Approved: 2, Needs Revision: 1)
  const metricCounts = React.useMemo(() => {
    const total = documents.length;
    const pending = documents.filter(
      (d) => d.status === "pending" || d.status === "in_review"
    ).length;
    const approved = documents.filter((d) => d.status === "approved").length;
    const needsRevision = documents.filter((d) => d.status === "needs_revision").length;

    return { total, pending, approved, needsRevision };
  }, [documents]);

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
    if ("original_filename" in uploaded) {
      const newDoc = adaptBackendDocument(uploaded, "You", "");
      setDocuments((prev) => [newDoc, ...prev]);
      showToast(`"${newDoc.title}" submitted for compliance pre-screening.`);
    } else {
      const newDoc: ComplianceDocument = {
        id: uploaded.id || `DOC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        title: uploaded.title || "Untitled Marketing Document.pdf",
        advisor_id: "adv-101",
        advisor_name: "James A",
        advisor_email: "j.adams@apexadvisory.com",
        status: "pending",
        file_reference: uploaded.file_reference || "s3://compliance-vault/docs/sample.pdf",
        type: uploaded.type || "Presentation / Deck",
        uploaded_at: new Date().toISOString(),
        thread_id: uploaded.thread_id || `THR-${Math.floor(1000 + Math.random() * 9000)}`,
        replaces_document_id: null,
        version: 1,
        file_size_mb: uploaded.file_size_mb || 2.4,
      };
      setDocuments((prev) => [newDoc, ...prev]);
      showToast(`"${newDoc.title}" submitted for compliance pre-screening.`);
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
    setDocuments((prev) => [newDoc, ...prev]);
    showToast(`Version submitted -- now pending review.`);
  };

  if (!isReady) {
    return null;
  }


  return (
    <div className="flex min-h-screen w-full bg-[#f8fafc] text-slate-900 font-inter">
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
                  : "Overview",
            },
          ]}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onToggleMobileSidebar={() => setMobileSidebarOpen(true)}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 p-5 sm:p-7 lg:p-8 max-w-[1400px] w-full mx-auto space-y-6 font-inter">
          {/* VIEW 1: GENERAL OVERVIEW DASHBOARD */}
          {activeView === "overview" && (
            <>
              {/* Top Salutation — Big elegant non-bold Inter font with Advisor name */}
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-[46px] font-normal text-slate-800 tracking-tight font-inter leading-tight">
                  Good morning, James.
                </h1>
              </div>

              {/* 4 Summary Metric Cards (Clicking one opens My Submissions with that filter) */}
              <div id="metric-cards-section">
                <MetricCards
                  total={metricCounts.total}
                  pending={metricCounts.pending}
                  approved={metricCounts.approved}
                  needsRevision={metricCounts.needsRevision}
                  activeFilter={statusFilter}
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
                  onCertificateClick={(doc) => setCertificateDoc(doc)}
                  onResetFilters={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                />
              </div>

              {/* Recent Activity Feed Section */}
              <div id="recent-activity-section">
                <RecentActivity
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
                  <h1 className="text-3xl sm:text-4xl font-normal text-slate-800 tracking-tight font-inter leading-tight">
                    My Submissions
                  </h1>
                  <p className="text-xs font-normal text-slate-400 mt-1 font-inter">
                    Manage, search, and track all your compliance marketing filings and pre-screening requests.
                  </p>
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
                  onCertificateClick={(doc) => setCertificateDoc(doc)}
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
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-normal text-slate-800 tracking-tight font-inter leading-tight">
                    History
                  </h1>
                  <p className="text-xs font-normal text-slate-400 mt-1 font-inter">
                    Full audit trail of compliance reviews, revisions, and approval decisions.
                  </p>
                </div>
              </div>

              <RecentActivity
                onItemClick={(docId) => {
                  const target = documents.find((d) => d.id === docId);
                  if (target) setSelectedDocument(target);
                }}
              />
            </>
          )}

          {/* VIEW 4: METRICS & ANALYTICS DASHBOARD */}
          {activeView === "metrics" && (
            <MetricsDashboardView
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
        </main>
      </div>

      {/* Slide-over Inspector Drawer for Selected Document */}
      <DocumentInspectorDrawer
        document={selectedDocument}
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

      {/* Compliance Approval Certificate Modal */}
      <CertificateModal
        document={certificateDoc}
        isOpen={!!certificateDoc}
        onClose={() => setCertificateDoc(null)}
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
