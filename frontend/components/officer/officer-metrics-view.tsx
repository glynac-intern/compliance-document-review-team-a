"use client";

import * as React from "react";
import { AnalyticsTimeHorizon } from "@/types/analytics";
import { computeRealAnalytics, getHorizonLabel } from "@/lib/real-analytics";
import { reviewsApi, type QueueDocument } from "@/lib/reviews-api";
import { KpiSummaryStrip } from "@/components/analytics/kpi-summary-strip";
import { SubmissionTrendChart } from "@/components/analytics/submission-trend-chart";
import { OutcomeDistributionChart } from "@/components/analytics/outcome-distribution-chart";
import { CategoryBreakdownCard } from "@/components/analytics/category-breakdown-card";
import { TurnaroundVelocityCard } from "@/components/analytics/turnaround-velocity-card";
import {
  Download,
  RotateCw,
  AlertCircle,
  Calendar,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OfficerMetricsViewProps {
  documents?: QueueDocument[];
  onShowToast?: (msg: string) => void;
}

export function OfficerMetricsView({
  documents: externalDocuments,
  onShowToast,
}: OfficerMetricsViewProps) {
  const [timeHorizon, setTimeHorizon] = React.useState<AnalyticsTimeHorizon>("12m");
  const [isLoading, setIsLoading] = React.useState(!externalDocuments);
  const [hasError, setHasError] = React.useState(false);
  const [fetchedDocuments, setFetchedDocuments] = React.useState<QueueDocument[]>([]);

  const rawDocuments = externalDocuments ?? fetchedDocuments;
  const data = React.useMemo(
    () => computeRealAnalytics(rawDocuments, timeHorizon),
    [rawDocuments, timeHorizon]
  );

  const fetchQueue = React.useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const queueDocs = await reviewsApi.getQueue();
      setFetchedDocuments(queueDocs);
    } catch (err) {
      console.error("Failed to load compliance review queue for analytics:", err);
      setFetchedDocuments([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!externalDocuments) {
      fetchQueue();
    }
  }, [externalDocuments, fetchQueue]);

  // Handle Horizon Change
  const handleHorizonChange = (horizon: AnalyticsTimeHorizon) => {
    setTimeHorizon(horizon);
  };

  const handleRefresh = async () => {
    if (!externalDocuments) {
      await fetchQueue();
    }
    onShowToast?.("Compliance review operations data synchronized with repository.");
  };

  const handleExport = () => {
    // Trigger CSV download formatted for compliance audit records
    const csvRows = [
      [
        "Reporting Period",
        "Reviews Completed",
        "Approved",
        "Needs Revision",
        "Rejected",
        "Clearance Rate %",
      ],
      ...data.timeSeries.map((p) => [
        p.label + (p.sublabel ? ` ${p.sublabel}` : ""),
        p.total,
        p.approved,
        p.needsRevision,
        p.rejected,
        p.approvalRatePct,
      ]),
    ];
    const csvContent =
      "data:text/csv;charset=utf-8," + csvRows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `verity_officer_review_analytics_${timeHorizon}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onShowToast?.(
      `Exported ${getHorizonLabel(data.timeHorizon)} Compliance Officer Audit Report.`
    );
  };

  return (
    <div className="space-y-6 font-inter select-none">
      {/* Top Header & Operational Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-normal text-slate-800 dark:text-slate-100 tracking-tight font-inter">
            Compliance Review Analytics
          </h1>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          {/* Time Horizon Select Control with extended monthly, quarterly, and annual options */}
          <div className="relative">
            <Calendar
              className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none"
              strokeWidth={1.8}
            />
            <select
              value={timeHorizon}
              onChange={(e) =>
                handleHorizonChange(e.target.value as AnalyticsTimeHorizon)
              }
              aria-label="Select reporting time period"
              className="h-9 rounded-xl bg-[#f4f6f8] border border-slate-200 text-xs font-normal font-inter text-slate-700 pl-8.5 pr-8 focus:outline-none focus:bg-white focus:border-[#1e4c77] focus:ring-2 focus:ring-[#1e4c77]/15 transition-all cursor-pointer appearance-none shadow-2xs"
            >
              <optgroup label="Monthly Horizons">
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="6m">Last 6 Months</option>
                <option value="12m">Last 12 Months</option>
              </optgroup>
              <optgroup label="Quarterly Horizons">
                <option value="4q">Last 4 Quarters</option>
                <option value="8q">Last 8 Quarters</option>
              </optgroup>
              <optgroup label="Annual Horizons">
                <option value="ytd">Year to Date (2026)</option>
                <option value="3y">Last 3 Years</option>
              </optgroup>
            </select>
            <ChevronDown
              className="absolute right-2.5 top-3 h-3 w-3 text-slate-400 pointer-events-none"
              strokeWidth={1.8}
            />
          </div>

          {/* Unified Utility Action Dock */}
          <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100/90 border border-slate-200/80 shadow-2xs">
            {/* Sync / Refresh Button */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isLoading}
              title="Sync metrics"
              className={cn(
                "h-8 w-8 rounded-md flex items-center justify-center transition-all duration-150 cursor-pointer disabled:opacity-50 text-slate-500 hover:text-slate-900 hover:bg-white hover:shadow-2xs",
                isLoading && "bg-white text-[#1e4c77] shadow-2xs"
              )}
            >
              <RotateCw
                className={cn(
                  "h-4 w-4 stroke-[1.8] transition-transform",
                  isLoading && "animate-spin text-[#1e4c77]"
                )}
              />
            </button>

            {/* Subtle Divider */}
            <div className="h-4 w-[1px] bg-slate-200 mx-0.5" />

            {/* Export Report CSV Button */}
            <button
              type="button"
              onClick={handleExport}
              title="Export compliance audit report CSV"
              className="h-8 px-2.5 rounded-md flex items-center gap-1.5 transition-all duration-150 cursor-pointer text-xs font-normal text-slate-600 hover:text-slate-900 hover:bg-white hover:shadow-2xs font-inter"
            >
              <Download className="h-3.5 w-3.5 stroke-[1.8]" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Fallback State */}
      {hasError ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center space-y-3 shadow-2xs">
          <AlertCircle className="h-6 w-6 text-slate-600 mx-auto" />
          <h3 className="text-sm font-medium text-slate-800">
            Unable to Load Compliance Review Analytics
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            The reporting service encountered a temporary error while aggregating officer decision records.
          </p>
          <button
            type="button"
            onClick={handleRefresh}
            className="h-8 px-4 rounded-lg bg-[#1e4c77] text-white text-xs font-medium transition-all hover:bg-[#163c60] cursor-pointer shadow-xs"
          >
            Retry Sync
          </button>
        </div>
      ) : isLoading ? (
        /* Loading Skeleton State */
        <div className="space-y-6 animate-pulse">
          {/* Skeleton KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-26 rounded-2xl border border-white/10 bg-[#1e4c77]/70 p-4 sm:p-5 shadow-sm"
              >
                <div className="h-3 w-20 bg-white/20 rounded mb-3" />
                <div className="h-6 w-16 bg-white/30 rounded" />
              </div>
            ))}
          </div>

          {/* Skeleton Hero Chart */}
          <div className="h-72 rounded-xl border border-slate-200 bg-white p-5 shadow-2xs" />

          {/* Skeleton 2 Columns Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-80 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs" />
            <div className="h-80 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs" />
          </div>
        </div>
      ) : (
        /* Populated Content State */
        <div className="space-y-6">
          {/* 1. Executive Performance Strip with Officer Labels */}
          <KpiSummaryStrip
            kpis={{
              // TA-105: this card is explicitly labeled "Reviews
              // Completed" -- it must show the count of DECIDED
              // documents (outcomeDistribution.totalReviewed), not
              // kpis.totalSubmissions (every document in the horizon,
              // pending ones included). data.kpis.totalSubmissions is
              // left as-is for any other consumer that wants the raw
              // submission count.
              ...data.kpis,
              totalSubmissions: data.outcomeDistribution.totalReviewed,
            }}
            labels={{
              total: "Reviews Completed",
              approved: "Clearance Rate",
              revisions: "Revision Rate",
              rejections: "Rejection Rate",
              velocity: "Median Turnaround",
            }}
          />

          {/* 2. Full-Width Trajectory Hero Chart */}
          <div>
            <SubmissionTrendChart
              data={data.timeSeries}
              title={
                timeHorizon === "30d"
                  ? "Weekly Review Intake & Clearance Trajectory (Last 30 Days)"
                  : timeHorizon === "90d" || timeHorizon === "ytd"
                  ? "Monthly Review Intake & Clearance Velocity (90 Days / YTD)"
                  : timeHorizon === "6m"
                  ? "Monthly Intake & Regulatory Determinations (Last 6 Months)"
                  : timeHorizon === "12m"
                  ? "Monthly Review Volume & Decisions (Last 12 Months)"
                  : timeHorizon === "4q"
                  ? "Quarterly Review Volume & Decisions (Last 4 Quarters)"
                  : timeHorizon === "8q"
                  ? "Quarterly Review Volume & Decisions (Last 8 Quarters)"
                  : "Multi-Year Review Intake & Outcomes (Last 3 Years)"
              }
            />
          </div>

          {/* 3. Balanced 2-Column Grid: Regulatory Outcomes & Review Velocity Tiers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <OutcomeDistributionChart
              data={data.outcomeDistribution}
              title="Regulatory Determinations"
            />

            <TurnaroundVelocityCard
              tiers={data.turnaroundTiers}
              slaCompliancePct={data.kpis.slaCompliancePct}
              medianHours={data.kpis.medianTurnaroundHours}
              title="Review Velocity & SLA Tiers"
            />
          </div>

          {/* 4. Balanced 2-Column Grid: Category Breakdown & Risk Oversight */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CategoryBreakdownCard
              categories={data.categoryBreakdown}
              title="Clearance & SLA by Category"
            />

            {/* Officer Risk & Supervisory Oversight Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs font-inter flex flex-col justify-between h-full">
              {/* Header */}
              <div className="pb-3.5 border-b border-slate-100 mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm sm:text-base font-medium text-slate-800 tracking-tight font-inter">
                    Supervisory & Quality Telemetry
                  </h2>
                </div>
                <span className="text-[11px] uppercase tracking-wider font-medium text-slate-400 font-inter">
                  Real Operations
                </span>
              </div>

              {/* Real Metrics Rows */}
              <div className="space-y-3 pt-0.5">
                {/* Metric 1: First-Pass Clearance */}
                {(() => {
                  const hasReviewed = data.outcomeDistribution.totalReviewed > 0;
                  const rate = data.kpis.firstPassClearanceRatePct;
                  return (
                    <div className="group flex items-center justify-between gap-3 text-xs">
                      <div className="w-36 sm:w-44 shrink-0">
                        <span className="font-normal text-slate-700 font-inter group-hover:text-[#1e4c77] transition-colors truncate block">
                          First-Pass Clearance
                        </span>
                      </div>
                      <div className="flex-1 min-w-[60px] h-1 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          style={{ width: `${hasReviewed ? rate : 0}%` }}
                          className="h-full rounded-full bg-[#1e4c77] transition-all duration-300"
                        />
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-right">
                        <span className="text-[11px] text-slate-400 font-numbers tabular-nums w-16 text-right">
                          {hasReviewed ? `${data.outcomeDistribution.approvedCount} approved` : "00 approved"}
                        </span>
                        <span className="text-[12px] font-numbers font-medium tabular-nums w-14 text-right">
                          {hasReviewed ? (
                            <span className="text-[#1e4c77]">{rate.toFixed(1)}%</span>
                          ) : (
                            <span className="text-slate-400 font-normal">No data</span>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Metric 2: Revision Required Rate */}
                {(() => {
                  const hasReviewed = data.outcomeDistribution.totalReviewed > 0;
                  const rate = data.kpis.revisionRatePct;
                  return (
                    <div className="group flex items-center justify-between gap-3 text-xs">
                      <div className="w-36 sm:w-44 shrink-0">
                        <span className="font-normal text-slate-700 font-inter group-hover:text-[#1e4c77] transition-colors truncate block">
                          Revision Iterations
                        </span>
                      </div>
                      <div className="flex-1 min-w-[60px] h-1 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          style={{ width: `${hasReviewed ? rate : 0}%` }}
                          className="h-full rounded-full bg-[#1e4c77] transition-all duration-300"
                        />
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-right">
                        <span className="text-[11px] text-slate-400 font-numbers tabular-nums w-16 text-right">
                          {hasReviewed ? `${data.outcomeDistribution.revisionCount} revisions` : "00 revisions"}
                        </span>
                        <span className="text-[12px] font-numbers font-medium tabular-nums w-14 text-right">
                          {hasReviewed && rate > 0 ? (
                            <span className="text-[#1e4c77]">{rate.toFixed(1)}%</span>
                          ) : hasReviewed ? (
                            <span className="text-slate-500">00%</span>
                          ) : (
                            <span className="text-slate-400 font-normal">No data</span>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Metric 3: Rejection Intercept Rate */}
                {(() => {
                  const hasReviewed = data.outcomeDistribution.totalReviewed > 0;
                  const rate = data.kpis.rejectionRatePct;
                  return (
                    <div className="group flex items-center justify-between gap-3 text-xs">
                      <div className="w-36 sm:w-44 shrink-0">
                        <span className="font-normal text-slate-700 font-inter group-hover:text-[#1e4c77] transition-colors truncate block">
                          Determination Rejections
                        </span>
                      </div>
                      <div className="flex-1 min-w-[60px] h-1 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          style={{ width: `${hasReviewed ? rate : 0}%` }}
                          className="h-full rounded-full bg-[#1e4c77] transition-all duration-300"
                        />
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-right">
                        <span className="text-[11px] text-slate-400 font-numbers tabular-nums w-16 text-right">
                          {hasReviewed ? `${data.outcomeDistribution.rejectedCount} rejected` : "00 rejected"}
                        </span>
                        <span className="text-[12px] font-numbers font-medium tabular-nums w-14 text-right">
                          {hasReviewed && rate > 0 ? (
                            <span className="text-[#1e4c77]">{rate.toFixed(1)}%</span>
                          ) : hasReviewed ? (
                            <span className="text-slate-500">00%</span>
                          ) : (
                            <span className="text-slate-400 font-normal">No data</span>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Metric 4: Active Queue Backlog */}
                {(() => {
                  const pendingCount = rawDocuments.filter((d) => d.status === "pending_review").length;
                  const totalCount = rawDocuments.length;
                  const pendingPct = totalCount > 0 ? (pendingCount / totalCount) * 100 : 0;
                  return (
                    <div className="group flex items-center justify-between gap-3 text-xs">
                      <div className="w-36 sm:w-44 shrink-0">
                        <span className="font-normal text-slate-700 font-inter group-hover:text-[#1e4c77] transition-colors truncate block">
                          Active Intake in Queue
                        </span>
                      </div>
                      <div className="flex-1 min-w-[60px] h-1 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          style={{ width: `${totalCount > 0 ? pendingPct : 0}%` }}
                          className="h-full rounded-full bg-[#1e4c77] transition-all duration-300"
                        />
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-right">
                        <span className="text-[11px] text-slate-400 font-numbers tabular-nums w-16 text-right">
                          {totalCount > 0 ? `${pendingCount} pending` : "00 docs"}
                        </span>
                        <span className="text-[12px] font-numbers font-medium tabular-nums w-14 text-right">
                          {totalCount > 0 ? (
                            <span className="text-[#1e4c77]">{pendingPct.toFixed(1)}%</span>
                          ) : (
                            <span className="text-slate-400 font-normal">No data</span>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Subtle Footer Note */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-inter font-normal">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#1e4c77]" />
                  Human-in-the-Loop Safeguard
                </span>
                <span className="text-slate-600 font-medium">
                  {rawDocuments.length > 0
                    ? `${rawDocuments.length} repository records`
                    : "No data"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
