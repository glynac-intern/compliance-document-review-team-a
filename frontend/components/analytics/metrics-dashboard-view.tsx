"use client";

import * as React from "react";
import { AnalyticsTimeHorizon, AnalyticsDataSet } from "@/types/analytics";
import { getAnalyticsData, getHorizonLabel } from "@/lib/mock-analytics";
import { KpiSummaryStrip } from "./kpi-summary-strip";
import { SubmissionTrendChart } from "./submission-trend-chart";
import { OutcomeDistributionChart } from "./outcome-distribution-chart";
import { CategoryBreakdownCard } from "./category-breakdown-card";
import { TurnaroundVelocityCard } from "./turnaround-velocity-card";
import {
  Download,
  RotateCw,
  AlertCircle,
  Calendar,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricsDashboardViewProps {
  onExportReport?: () => void;
  onShowToast?: (msg: string) => void;
}

export function MetricsDashboardView({
  onExportReport,
  onShowToast,
}: MetricsDashboardViewProps) {
  const [timeHorizon, setTimeHorizon] = React.useState<AnalyticsTimeHorizon>("12m");
  const [isLoading, setIsLoading] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);
  const [data, setData] = React.useState<AnalyticsDataSet>(() => getAnalyticsData("12m"));

  // Handle Horizon Change with micro-loading transition
  const handleHorizonChange = (horizon: AnalyticsTimeHorizon) => {
    if (horizon === timeHorizon) return;
    setIsLoading(true);
    setTimeHorizon(horizon);

    setTimeout(() => {
      setData(getAnalyticsData(horizon));
      setIsLoading(false);
    }, 250);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setHasError(false);

    setTimeout(() => {
      setData(getAnalyticsData(timeHorizon));
      setIsLoading(false);
      onShowToast?.("Compliance metrics synced with repository.");
    }, 350);
  };

  const handleExport = () => {
    if (onExportReport) {
      onExportReport();
    } else {
      // Trigger simple CSV download for compliance audit records
      const csvRows = [
        ["Period", "Submissions", "Approved", "Needs Revision", "Rejected", "Approval Rate %"],
        ...data.timeSeries.map((p) => [
          p.label + (p.sublabel ? ` ${p.sublabel}` : ""),
          p.total,
          p.approved,
          p.needsRevision,
          p.rejected,
          p.approvalRatePct,
        ]),
      ];
      const csvContent = "data:text/csv;charset=utf-8," + csvRows.map((e) => e.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `verity_compliance_metrics_${timeHorizon}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onShowToast?.(`Exported ${getHorizonLabel(data.timeHorizon)} Compliance Audit Report.`);
    }
  };

  return (
    <div className="space-y-6 font-inter select-none">
      {/* Top Header & Operational Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          {/* Main title strictly "Compliance Analytics" without subtitle paragraphs */}
          <h1 className="text-2xl sm:text-3xl font-normal text-slate-800 tracking-tight font-inter">
            Compliance Analytics
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

          {/* Unified Utility Action Dock — Matching TopBar utility toolbar theme */}
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

      {/* Error Fallback State (Themed to Verity slate/navy, no harsh red) */}
      {hasError ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center space-y-3 shadow-2xs">
          <AlertCircle className="h-6 w-6 text-slate-600 mx-auto" />
          <h3 className="text-sm font-medium text-slate-800">
            Unable to Load Compliance Metrics
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            The reporting service encountered a temporary error while aggregating document audit logs.
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
        /* Loading Skeleton State matching new symmetrical layout */
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

          {/* Skeleton 3 Columns Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="h-80 rounded-xl border border-slate-200 bg-white p-5 shadow-2xs" />
            <div className="h-80 rounded-xl border border-slate-200 bg-white p-5 shadow-2xs" />
            <div className="h-80 rounded-xl border border-slate-200 bg-white p-5 shadow-2xs" />
          </div>
        </div>
      ) : (
        /* Populated Content State */
        <div className="space-y-6">
          {/* 1. Executive Performance Strip */}
          <KpiSummaryStrip kpis={data.kpis} />

          {/* 2. Full-Width Trajectory Hero Chart (No gap in middle, full horizontal breath) */}
          <div>
            <SubmissionTrendChart
              data={data.timeSeries}
              title={
                timeHorizon === "30d"
                  ? "Weekly Submissions & Review Decisions (Last 30 Days)"
                  : timeHorizon === "90d" || timeHorizon === "ytd"
                  ? "Monthly Intake & Clearance Trajectory (90 Days / YTD)"
                  : timeHorizon === "6m"
                  ? "Monthly Intake & Review Decisions (Last 6 Months)"
                  : timeHorizon === "12m"
                  ? "Monthly Submissions & Review Decisions (Last 12 Months)"
                  : timeHorizon === "4q"
                  ? "Quarterly Intake & Clearance Trajectory (Last 4 Quarters)"
                  : timeHorizon === "8q"
                  ? "Quarterly Intake & Clearance Trajectory (Last 8 Quarters)"
                  : "Multi-Year Intake & Approval Trends (Last 3 Years)"
              }
            />
          </div>

          {/* 3. Balanced, Minimalist 3-Column Grid (Eliminates awkward gaps) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <OutcomeDistributionChart
              data={data.outcomeDistribution}
              title="Regulatory Outcomes"
            />

            <CategoryBreakdownCard
              categories={data.categoryBreakdown}
              title="Throughput by Category"
            />

            <TurnaroundVelocityCard
              tiers={data.turnaroundTiers}
              slaCompliancePct={data.kpis.slaCompliancePct}
              medianHours={data.kpis.medianTurnaroundHours}
              title="Review Velocity & SLA"
            />
          </div>
        </div>
      )}
    </div>
  );
}
