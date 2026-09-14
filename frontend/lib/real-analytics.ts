import {
  AnalyticsDataSet,
  AnalyticsTimeHorizon,
  CategoryMetric,
  OperationalKPIs,
  OutcomeDistribution,
  TimeSeriesPoint,
  TurnaroundTier,
} from "@/types/analytics";
import type { BackendDocument } from "./documents-api";
import type { QueueDocument } from "./reviews-api";
import type { ComplianceDocument } from "@/types/compliance";

export type AnyDocument = BackendDocument | QueueDocument | ComplianceDocument;

export function getHorizonLabel(horizon: AnalyticsTimeHorizon): string {
  switch (horizon) {
    case "30d":
      return "Last 30 Days";
    case "90d":
      return "Last 90 Days";
    case "6m":
      return "Last 6 Months";
    case "12m":
      return "Last 12 Months";
    case "4q":
      return "Last 4 Quarters";
    case "8q":
      return "Last 8 Quarters";
    case "ytd":
      return "Year to Date (2026)";
    case "3y":
      return "Last 3 Years";
    default:
      return "Last 12 Months";
  }
}

export const CANONICAL_CATEGORIES = [
  "Presentation / Deck",
  "Promotional Brochure",
  "Client Letter",
  "Market Commentary",
  "Performance Factsheet",
  "Social Media Post",
  "Other",
] as const;

export function resolveDocumentCategory(doc: AnyDocument): string {
  const filename = (
    ("original_filename" in doc ? doc.original_filename : null) ??
    ("title" in doc ? doc.title : "") ??
    ""
  ).toLowerCase();

  const rawType = (doc.type ?? "").toLowerCase();

  if (filename.includes("deck") || filename.includes("presentation") || rawType === "pdf") {
    if (filename.includes("letter")) return "Client Letter";
    if (filename.includes("brochure") || filename.includes("promo")) return "Promotional Brochure";
    if (filename.includes("factsheet") || filename.includes("sheet")) return "Performance Factsheet";
    if (filename.includes("commentary") || filename.includes("market")) return "Market Commentary";
    if (filename.includes("social") || filename.includes("post")) return "Social Media Post";
    return "Presentation / Deck";
  }

  if (filename.includes("brochure") || filename.includes("flyer")) return "Promotional Brochure";
  if (filename.includes("letter") || rawType === "docx") return "Client Letter";
  if (filename.includes("commentary") || filename.includes("memo")) return "Market Commentary";
  if (filename.includes("factsheet") || filename.includes("sheet") || rawType === "xlsx") return "Performance Factsheet";
  if (filename.includes("social") || filename.includes("post") || filename.includes("tweet")) return "Social Media Post";

  return "Other";
}

/**
 * Computes analytics dynamically from REAL document records.
 * Falls back to 0 / "No data" if records or timestamps are absent.
 */
export function computeRealAnalytics(
  documents: AnyDocument[] = [],
  horizon: AnalyticsTimeHorizon = "12m"
): AnalyticsDataSet {
  const now = Date.now();

  const horizonMsMap: Record<AnalyticsTimeHorizon, number> = {
    "30d": 30 * 86400000,
    "90d": 90 * 86400000,
    "6m": 180 * 86400000,
    "12m": 365 * 86400000,
    "4q": 365 * 86400000,
    "8q": 730 * 86400000,
    "ytd": now - new Date(new Date().getFullYear(), 0, 1).getTime(),
    "3y": 3 * 365 * 86400000,
  };

  const maxAge = horizonMsMap[horizon] ?? horizonMsMap["12m"];
  const filtered = documents.filter((d) => {
    if (!d.uploaded_at) return true;
    const uploadedTime = new Date(d.uploaded_at).getTime();
    if (isNaN(uploadedTime)) return true;
    return now - uploadedTime <= maxAge;
  });

  const totalSubmissions = filtered.length;

  let approvedCount = 0;
  let revisionCount = 0;
  let rejectedCount = 0;
  for (const doc of filtered) {
    const s = (doc.status ?? "").toLowerCase();
    if (s === "approved") approvedCount++;
    else if (s === "needs_revision") revisionCount++;
    else if (s === "rejected") rejectedCount++;
  }

  const totalReviewed = approvedCount + revisionCount + rejectedCount;
  const approvalRatePct = totalReviewed > 0 ? (approvedCount / totalReviewed) * 100 : 0;
  const revisionRatePct = totalReviewed > 0 ? (revisionCount / totalReviewed) * 100 : 0;
  const rejectionRatePct = totalReviewed > 0 ? (rejectedCount / totalReviewed) * 100 : 0;

  // Real Category Breakdown
  const categoryMap: Record<string, { total: number; approved: number; revision: number; rejected: number }> = {};
  for (const cat of CANONICAL_CATEGORIES) {
    categoryMap[cat] = { total: 0, approved: 0, revision: 0, rejected: 0 };
  }

  for (const doc of filtered) {
    const cat = resolveDocumentCategory(doc);
    if (!categoryMap[cat]) {
      categoryMap[cat] = { total: 0, approved: 0, revision: 0, rejected: 0 };
    }
    categoryMap[cat].total++;
    const s = (doc.status ?? "").toLowerCase();
    if (s === "approved") categoryMap[cat].approved++;
    else if (s === "needs_revision") categoryMap[cat].revision++;
    else if (s === "rejected") categoryMap[cat].rejected++;
  }

  const categoryBreakdown: CategoryMetric[] = CANONICAL_CATEGORIES.map((type) => {
    const stats = categoryMap[type] ?? { total: 0, approved: 0, revision: 0, rejected: 0 };
    const decided = stats.approved + stats.revision + stats.rejected;
    const clearance = decided > 0 ? (stats.approved / decided) * 100 : 0;
    return {
      type: type as CategoryMetric["type"],
      totalSubmissions: stats.total,
      approvedCount: stats.approved,
      revisionCount: stats.revision,
      rejectedCount: stats.rejected,
      clearanceRatePct: clearance,
      avgTurnaroundHours: 0,
    };
  });

  // Real Turnaround Tiers
  const turnaroundDurations: number[] = [];
  for (const doc of filtered) {
    const docObj = doc as unknown as Record<string, unknown>;
    const reviewObj = docObj.review && typeof docObj.review === "object" ? (docObj.review as Record<string, unknown>) : null;
    const decidedAt =
      (typeof reviewObj?.decided_at === "string" ? reviewObj.decided_at : null) ||
      (typeof docObj.reviewed_at === "string" ? (docObj.reviewed_at as string) : null);
    if (decidedAt && doc.uploaded_at) {
      const ms = new Date(decidedAt).getTime() - new Date(doc.uploaded_at).getTime();
      if (ms > 0) {
        turnaroundDurations.push(ms / (1000 * 60 * 60));
      }
    }
  }

  let under2h = 0;
  let between2and6 = 0;
  let between6and24 = 0;
  let over24 = 0;

  for (const h of turnaroundDurations) {
    if (h < 2) under2h++;
    else if (h <= 6) between2and6++;
    else if (h <= 24) between6and24++;
    else over24++;
  }

  const totalTurnaroundDocs = turnaroundDurations.length;
  const turnaroundTiers: TurnaroundTier[] = [
    {
      rangeLabel: "< 2 Hours",
      description: "Rapid pass-through",
      count: under2h,
      percentage: totalTurnaroundDocs > 0 ? (under2h / totalTurnaroundDocs) * 100 : 0,
      color: "#2575bc",
    },
    {
      rangeLabel: "2 – 6 Hours",
      description: "Standard review",
      count: between2and6,
      percentage: totalTurnaroundDocs > 0 ? (between2and6 / totalTurnaroundDocs) * 100 : 0,
      color: "#1e4c77",
    },
    {
      rangeLabel: "6 – 24 Hours",
      description: "Multi-flag review",
      count: between6and24,
      percentage: totalTurnaroundDocs > 0 ? (between6and24 / totalTurnaroundDocs) * 100 : 0,
      color: "#4a9ae1",
    },
    {
      rangeLabel: "> 24 Hours",
      description: "Complex escalation",
      count: over24,
      percentage: totalTurnaroundDocs > 0 ? (over24 / totalTurnaroundDocs) * 100 : 0,
      color: "#0f2b48",
    },
  ];

  let medianTurnaroundHours = 0;
  if (turnaroundDurations.length > 0) {
    const sorted = [...turnaroundDurations].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    medianTurnaroundHours =
      sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  const under24hCount = under2h + between2and6 + between6and24;
  const slaCompliancePct =
    totalTurnaroundDocs > 0 ? (under24hCount / totalTurnaroundDocs) * 100 : 0;

  const kpis: OperationalKPIs = {
    totalSubmissions,
    totalSubmissionsDeltaPct: 0,
    approvalRatePct,
    approvalRateDeltaPct: 0,
    revisionRatePct,
    revisionRateDeltaPct: 0,
    rejectionRatePct,
    rejectionRateDeltaPct: 0,
    medianTurnaroundHours,
    firstPassClearanceRatePct: totalReviewed > 0 ? (approvedCount / totalReviewed) * 100 : 0,
    slaCompliancePct,
  };

  const outcomeDistribution: OutcomeDistribution = {
    approvedCount,
    approvedPct: totalReviewed > 0 ? (approvedCount / totalReviewed) * 100 : 0,
    revisionCount,
    revisionPct: totalReviewed > 0 ? (revisionCount / totalReviewed) * 100 : 0,
    rejectedCount,
    rejectedPct: totalReviewed > 0 ? (rejectedCount / totalReviewed) * 100 : 0,
    totalReviewed,
  };

  // Generate real chronological series points
  const timeSeries = buildTimeSeriesFromDocs(filtered);

  return {
    timeHorizon: horizon,
    kpis,
    timeSeries,
    outcomeDistribution,
    categoryBreakdown,
    turnaroundTiers,
  };
}

function buildTimeSeriesFromDocs(
  docs: AnyDocument[]
): TimeSeriesPoint[] {
  if (docs.length === 0) {
    return [
      { periodKey: "p1", label: "Period 1", total: 0, approved: 0, needsRevision: 0, rejected: 0, pending: 0, approvalRatePct: 0 },
      { periodKey: "p2", label: "Period 2", total: 0, approved: 0, needsRevision: 0, rejected: 0, pending: 0, approvalRatePct: 0 },
      { periodKey: "p3", label: "Period 3", total: 0, approved: 0, needsRevision: 0, rejected: 0, pending: 0, approvalRatePct: 0 },
      { periodKey: "p4", label: "Period 4", total: 0, approved: 0, needsRevision: 0, rejected: 0, pending: 0, approvalRatePct: 0 },
    ];
  }

  // Group by month YYYY-MM
  const buckets: Record<string, { total: number; approved: number; revision: number; rejected: number; pending: number }> = {};

  for (const doc of docs) {
    const date = doc.uploaded_at ? new Date(doc.uploaded_at) : new Date();
    const key = !isNaN(date.getTime())
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      : "Current";

    if (!buckets[key]) {
      buckets[key] = { total: 0, approved: 0, revision: 0, rejected: 0, pending: 0 };
    }
    buckets[key].total++;
    const s = (doc.status ?? "").toLowerCase();
    if (s === "approved") buckets[key].approved++;
    else if (s === "needs_revision") buckets[key].revision++;
    else if (s === "rejected") buckets[key].rejected++;
    else buckets[key].pending++;
  }

  const sortedKeys = Object.keys(buckets).sort();
  return sortedKeys.map((key) => {
    const b = buckets[key];
    const decided = b.approved + b.revision + b.rejected;
    const approvalRate = decided > 0 ? (b.approved / decided) * 100 : 0;
    const parts = key.split("-");
    const label = parts.length === 2 ? new Date(parseInt(parts[0]), parseInt(parts[1]) - 1).toLocaleString("default", { month: "short" }) : key;
    const sublabel = parts.length === 2 ? parts[0] : "";

    return {
      periodKey: key,
      label,
      sublabel,
      total: b.total,
      approved: b.approved,
      needsRevision: b.revision,
      rejected: b.rejected,
      pending: b.pending,
      approvalRatePct: approvalRate,
    };
  });
}
