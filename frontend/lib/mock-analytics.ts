import {
  AnalyticsDataSet,
  AnalyticsTimeHorizon,
  TimeSeriesPoint,
  CategoryMetric,
  TurnaroundTier,
  OperationalKPIs,
} from "@/types/analytics";

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

// --- 30 DAYS DATASET (4 Weeks) ---
const WEEKLY_SERIES_30D: TimeSeriesPoint[] = [
  { periodKey: "2026-W08", label: "W1", sublabel: "Feb 16", total: 7, approved: 6, needsRevision: 1, rejected: 0, pending: 0, approvalRatePct: 85.7 },
  { periodKey: "2026-W09", label: "W2", sublabel: "Feb 23", total: 8, approved: 6, needsRevision: 2, rejected: 0, pending: 0, approvalRatePct: 75.0 },
  { periodKey: "2026-W10", label: "W3", sublabel: "Mar 02", total: 9, approved: 7, needsRevision: 1, rejected: 1, pending: 0, approvalRatePct: 77.8 },
  { periodKey: "2026-W11", label: "W4", sublabel: "Mar 09", total: 8, approved: 6, needsRevision: 1, rejected: 1, pending: 0, approvalRatePct: 75.0 },
];

// --- 90 DAYS / YTD DATASET (Jan 2026 - Mar 2026) ---
const MONTHLY_SERIES_90D: TimeSeriesPoint[] = [
  { periodKey: "2026-01", label: "Jan", sublabel: "2026", total: 28, approved: 22, needsRevision: 5, rejected: 1, pending: 0, approvalRatePct: 78.6 },
  { periodKey: "2026-02", label: "Feb", sublabel: "2026", total: 29, approved: 23, needsRevision: 4, rejected: 2, pending: 0, approvalRatePct: 79.3 },
  { periodKey: "2026-03", label: "Mar", sublabel: "2026", total: 28, approved: 22, needsRevision: 4, rejected: 1, pending: 1, approvalRatePct: 81.5 },
];

// --- 6 MONTHS DATASET (Oct 2025 - Mar 2026) ---
const MONTHLY_SERIES_6M: TimeSeriesPoint[] = [
  { periodKey: "2025-10", label: "Oct", sublabel: "2025", total: 24, approved: 19, needsRevision: 4, rejected: 1, pending: 0, approvalRatePct: 79.2 },
  { periodKey: "2025-11", label: "Nov", sublabel: "2025", total: 23, approved: 18, needsRevision: 3, rejected: 2, pending: 0, approvalRatePct: 78.3 },
  { periodKey: "2025-12", label: "Dec", sublabel: "2025", total: 18, approved: 15, needsRevision: 2, rejected: 1, pending: 0, approvalRatePct: 83.3 },
  { periodKey: "2026-01", label: "Jan", sublabel: "2026", total: 28, approved: 22, needsRevision: 5, rejected: 1, pending: 0, approvalRatePct: 78.6 },
  { periodKey: "2026-02", label: "Feb", sublabel: "2026", total: 29, approved: 23, needsRevision: 4, rejected: 2, pending: 0, approvalRatePct: 79.3 },
  { periodKey: "2026-03", label: "Mar", sublabel: "2026", total: 28, approved: 22, needsRevision: 4, rejected: 1, pending: 1, approvalRatePct: 81.5 },
];

// --- 12 MONTHS DATASET (Apr 2025 - Mar 2026) ---
const MONTHLY_SERIES_12M: TimeSeriesPoint[] = [
  { periodKey: "2025-04", label: "Apr", sublabel: "2025", total: 19, approved: 14, needsRevision: 3, rejected: 1, pending: 1, approvalRatePct: 77.8 },
  { periodKey: "2025-05", label: "May", sublabel: "2025", total: 22, approved: 17, needsRevision: 4, rejected: 1, pending: 0, approvalRatePct: 77.3 },
  { periodKey: "2025-06", label: "Jun", sublabel: "2025", total: 25, approved: 20, needsRevision: 3, rejected: 2, pending: 0, approvalRatePct: 80.0 },
  { periodKey: "2025-07", label: "Jul", sublabel: "2025", total: 20, approved: 15, needsRevision: 4, rejected: 1, pending: 0, approvalRatePct: 75.0 },
  { periodKey: "2025-08", label: "Aug", sublabel: "2025", total: 21, approved: 17, needsRevision: 3, rejected: 1, pending: 0, approvalRatePct: 81.0 },
  { periodKey: "2025-09", label: "Sep", sublabel: "2025", total: 27, approved: 21, needsRevision: 5, rejected: 1, pending: 0, approvalRatePct: 77.8 },
  { periodKey: "2025-10", label: "Oct", sublabel: "2025", total: 24, approved: 19, needsRevision: 4, rejected: 1, pending: 0, approvalRatePct: 79.2 },
  { periodKey: "2025-11", label: "Nov", sublabel: "2025", total: 23, approved: 18, needsRevision: 3, rejected: 2, pending: 0, approvalRatePct: 78.3 },
  { periodKey: "2025-12", label: "Dec", sublabel: "2025", total: 18, approved: 15, needsRevision: 2, rejected: 1, pending: 0, approvalRatePct: 83.3 },
  { periodKey: "2026-01", label: "Jan", sublabel: "2026", total: 28, approved: 22, needsRevision: 5, rejected: 1, pending: 0, approvalRatePct: 78.6 },
  { periodKey: "2026-02", label: "Feb", sublabel: "2026", total: 29, approved: 23, needsRevision: 4, rejected: 2, pending: 0, approvalRatePct: 79.3 },
  { periodKey: "2026-03", label: "Mar", sublabel: "2026", total: 28, approved: 22, needsRevision: 4, rejected: 1, pending: 1, approvalRatePct: 81.5 },
];

// --- 4 QUARTERS DATASET (Q2 2025 - Q1 2026) ---
const QUARTERLY_SERIES_4Q: TimeSeriesPoint[] = [
  { periodKey: "2025-Q2", label: "Q2", sublabel: "2025", total: 66, approved: 51, needsRevision: 11, rejected: 4, pending: 0, approvalRatePct: 77.3 },
  { periodKey: "2025-Q3", label: "Q3", sublabel: "2025", total: 68, approved: 53, needsRevision: 12, rejected: 3, pending: 0, approvalRatePct: 77.9 },
  { periodKey: "2025-Q4", label: "Q4", sublabel: "2025", total: 65, approved: 52, needsRevision: 9, rejected: 4, pending: 0, approvalRatePct: 80.0 },
  { periodKey: "2026-Q1", label: "Q1", sublabel: "2026", total: 85, approved: 67, needsRevision: 13, rejected: 4, pending: 1, approvalRatePct: 79.8 },
];

// --- 8 QUARTERS DATASET (Q2 2024 - Q1 2026) ---
const QUARTERLY_SERIES_8Q: TimeSeriesPoint[] = [
  { periodKey: "2024-Q2", label: "Q2", sublabel: "2024", total: 54, approved: 41, needsRevision: 10, rejected: 3, pending: 0, approvalRatePct: 75.9 },
  { periodKey: "2024-Q3", label: "Q3", sublabel: "2024", total: 59, approved: 45, needsRevision: 11, rejected: 3, pending: 0, approvalRatePct: 76.3 },
  { periodKey: "2024-Q4", label: "Q4", sublabel: "2024", total: 62, approved: 49, needsRevision: 10, rejected: 3, pending: 0, approvalRatePct: 79.0 },
  { periodKey: "2025-Q1", label: "Q1", sublabel: "2025", total: 68, approved: 52, needsRevision: 12, rejected: 4, pending: 0, approvalRatePct: 76.5 },
  { periodKey: "2025-Q2", label: "Q2", sublabel: "2025", total: 66, approved: 51, needsRevision: 11, rejected: 4, pending: 0, approvalRatePct: 77.3 },
  { periodKey: "2025-Q3", label: "Q3", sublabel: "2025", total: 68, approved: 53, needsRevision: 12, rejected: 3, pending: 0, approvalRatePct: 77.9 },
  { periodKey: "2025-Q4", label: "Q4", sublabel: "2025", total: 65, approved: 52, needsRevision: 9, rejected: 4, pending: 0, approvalRatePct: 80.0 },
  { periodKey: "2026-Q1", label: "Q1", sublabel: "2026", total: 85, approved: 67, needsRevision: 13, rejected: 4, pending: 1, approvalRatePct: 79.8 },
];

// --- 3 YEARS DATASET (2024, 2025, 2026 YTD) ---
const YEARLY_SERIES_3Y: TimeSeriesPoint[] = [
  { periodKey: "2024", label: "2024", sublabel: "Fiscal", total: 231, approved: 176, needsRevision: 43, rejected: 12, pending: 0, approvalRatePct: 76.2 },
  { periodKey: "2025", label: "2025", sublabel: "Fiscal", total: 267, approved: 208, needsRevision: 44, rejected: 15, pending: 0, approvalRatePct: 77.9 },
  { periodKey: "2026", label: "2026", sublabel: "YTD", total: 85, approved: 67, needsRevision: 13, rejected: 4, pending: 1, approvalRatePct: 79.8 },
];

const CATEGORIES_BREAKDOWN_12M: CategoryMetric[] = [
  {
    type: "Presentation / Deck",
    totalSubmissions: 96,
    approvedCount: 72,
    revisionCount: 19,
    rejectedCount: 5,
    clearanceRatePct: 75.0,
    avgTurnaroundHours: 5.4,
  },
  {
    type: "Promotional Brochure",
    totalSubmissions: 68,
    approvedCount: 55,
    revisionCount: 10,
    rejectedCount: 3,
    clearanceRatePct: 80.9,
    avgTurnaroundHours: 3.8,
  },
  {
    type: "Client Letter",
    totalSubmissions: 48,
    approvedCount: 40,
    revisionCount: 7,
    rejectedCount: 1,
    clearanceRatePct: 83.3,
    avgTurnaroundHours: 2.9,
  },
  {
    type: "Market Commentary",
    totalSubmissions: 32,
    approvedCount: 27,
    revisionCount: 4,
    rejectedCount: 1,
    clearanceRatePct: 84.4,
    avgTurnaroundHours: 3.1,
  },
  {
    type: "Performance Factsheet",
    totalSubmissions: 21,
    approvedCount: 16,
    revisionCount: 3,
    rejectedCount: 2,
    clearanceRatePct: 76.2,
    avgTurnaroundHours: 4.6,
  },
  {
    type: "Social Media Post",
    totalSubmissions: 11,
    approvedCount: 7,
    revisionCount: 2,
    rejectedCount: 2,
    clearanceRatePct: 63.6,
    avgTurnaroundHours: 1.8,
  },
  {
    type: "Other",
    totalSubmissions: 8,
    approvedCount: 6,
    revisionCount: 1,
    rejectedCount: 1,
    clearanceRatePct: 75.0,
    avgTurnaroundHours: 3.4,
  },
];

const TURNAROUND_TIERS_12M: TurnaroundTier[] = [
  {
    rangeLabel: "< 2 Hours",
    description: "Rapid pass-through",
    count: 118,
    percentage: 41.5,
    color: "#2575bc",
  },
  {
    rangeLabel: "2 – 6 Hours",
    description: "Standard review",
    count: 102,
    percentage: 35.9,
    color: "#1e4c77",
  },
  {
    rangeLabel: "6 – 24 Hours",
    description: "Multi-flag review",
    count: 51,
    percentage: 18.0,
    color: "#4a9ae1",
  },
  {
    rangeLabel: "> 24 Hours",
    description: "Complex escalation",
    count: 13,
    percentage: 4.6,
    color: "#0f2b48",
  },
];

export function getAnalyticsData(horizon: AnalyticsTimeHorizon): AnalyticsDataSet {
  // 30 Days
  if (horizon === "30d") {
    const totalSubmissions = 32;
    const approvedCount = 25;
    const revisionCount = 5;
    const rejectedCount = 2;
    const totalReviewed = approvedCount + revisionCount + rejectedCount;

    const kpis: OperationalKPIs = {
      totalSubmissions,
      totalSubmissionsDeltaPct: 8.4,
      approvalRatePct: 78.1,
      approvalRateDeltaPct: 3.2,
      revisionRatePct: 15.6,
      revisionRateDeltaPct: -2.1,
      rejectionRatePct: 6.3,
      rejectionRateDeltaPct: -1.1,
      medianTurnaroundHours: 3.1,
      firstPassClearanceRatePct: 68.8,
      slaCompliancePct: 98.2,
    };

    return {
      timeHorizon: "30d",
      kpis,
      timeSeries: WEEKLY_SERIES_30D,
      outcomeDistribution: {
        approvedCount,
        approvedPct: 78.1,
        revisionCount,
        revisionPct: 15.6,
        rejectedCount,
        rejectedPct: 6.3,
        totalReviewed,
      },
      categoryBreakdown: CATEGORIES_BREAKDOWN_12M.map((c) => ({
        ...c,
        totalSubmissions: Math.max(1, Math.round(c.totalSubmissions * 0.12)),
        approvedCount: Math.max(1, Math.round(c.approvedCount * 0.12)),
        revisionCount: Math.round(c.revisionCount * 0.12),
        rejectedCount: Math.round(c.rejectedCount * 0.12),
      })),
      turnaroundTiers: [
        { rangeLabel: "< 2 Hours", description: "Rapid pass-through", count: 16, percentage: 50.0, color: "#2575bc" },
        { rangeLabel: "2 – 6 Hours", description: "Standard review", count: 11, percentage: 34.4, color: "#1e4c77" },
        { rangeLabel: "6 – 24 Hours", description: "Multi-flag review", count: 4, percentage: 12.5, color: "#4a9ae1" },
        { rangeLabel: "> 24 Hours", description: "Complex escalation", count: 1, percentage: 3.1, color: "#0f2b48" },
      ],
    };
  }

  // 90 Days or YTD
  if (horizon === "90d" || horizon === "ytd") {
    const totalSubmissions = 85;
    const approvedCount = 67;
    const revisionCount = 13;
    const rejectedCount = 4;
    const totalReviewed = approvedCount + revisionCount + rejectedCount;

    const kpis: OperationalKPIs = {
      totalSubmissions,
      totalSubmissionsDeltaPct: 11.2,
      approvalRatePct: 78.8,
      approvalRateDeltaPct: 2.8,
      revisionRatePct: 15.3,
      revisionRateDeltaPct: -1.9,
      rejectionRatePct: 4.7,
      rejectionRateDeltaPct: -0.9,
      medianTurnaroundHours: 3.6,
      firstPassClearanceRatePct: 65.4,
      slaCompliancePct: 97.4,
    };

    return {
      timeHorizon: horizon,
      kpis,
      timeSeries: MONTHLY_SERIES_90D,
      outcomeDistribution: {
        approvedCount,
        approvedPct: 78.8,
        revisionCount,
        revisionPct: 15.3,
        rejectedCount,
        rejectedPct: 4.7,
        totalReviewed,
      },
      categoryBreakdown: CATEGORIES_BREAKDOWN_12M.map((c) => ({
        ...c,
        totalSubmissions: Math.max(1, Math.round(c.totalSubmissions * 0.3)),
        approvedCount: Math.max(1, Math.round(c.approvedCount * 0.3)),
        revisionCount: Math.round(c.revisionCount * 0.3),
        rejectedCount: Math.round(c.rejectedCount * 0.3),
      })),
      turnaroundTiers: [
        { rangeLabel: "< 2 Hours", description: "Rapid pass-through", count: 39, percentage: 45.9, color: "#2575bc" },
        { rangeLabel: "2 – 6 Hours", description: "Standard review", count: 31, percentage: 36.5, color: "#1e4c77" },
        { rangeLabel: "6 – 24 Hours", description: "Multi-flag review", count: 12, percentage: 14.1, color: "#4a9ae1" },
        { rangeLabel: "> 24 Hours", description: "Complex escalation", count: 3, percentage: 3.5, color: "#0f2b48" },
      ],
    };
  }

  // 6 Months
  if (horizon === "6m") {
    const totalSubmissions = 150;
    const approvedCount = 119;
    const revisionCount = 22;
    const rejectedCount = 8;
    const totalReviewed = approvedCount + revisionCount + rejectedCount;

    const kpis: OperationalKPIs = {
      totalSubmissions,
      totalSubmissionsDeltaPct: 12.8,
      approvalRatePct: 79.3,
      approvalRateDeltaPct: 2.5,
      revisionRatePct: 14.7,
      revisionRateDeltaPct: -1.8,
      rejectionRatePct: 5.3,
      rejectionRateDeltaPct: -0.7,
      medianTurnaroundHours: 3.9,
      firstPassClearanceRatePct: 64.2,
      slaCompliancePct: 96.9,
    };

    return {
      timeHorizon: "6m",
      kpis,
      timeSeries: MONTHLY_SERIES_6M,
      outcomeDistribution: {
        approvedCount,
        approvedPct: 79.3,
        revisionCount,
        revisionPct: 14.7,
        rejectedCount,
        rejectedPct: 5.3,
        totalReviewed,
      },
      categoryBreakdown: CATEGORIES_BREAKDOWN_12M.map((c) => ({
        ...c,
        totalSubmissions: Math.max(1, Math.round(c.totalSubmissions * 0.53)),
        approvedCount: Math.max(1, Math.round(c.approvedCount * 0.53)),
        revisionCount: Math.round(c.revisionCount * 0.53),
        rejectedCount: Math.round(c.rejectedCount * 0.53),
      })),
      turnaroundTiers: [
        { rangeLabel: "< 2 Hours", description: "Rapid pass-through", count: 65, percentage: 43.3, color: "#2575bc" },
        { rangeLabel: "2 – 6 Hours", description: "Standard review", count: 54, percentage: 36.0, color: "#1e4c77" },
        { rangeLabel: "6 – 24 Hours", description: "Multi-flag review", count: 25, percentage: 16.7, color: "#4a9ae1" },
        { rangeLabel: "> 24 Hours", description: "Complex escalation", count: 6, percentage: 4.0, color: "#0f2b48" },
      ],
    };
  }

  // 4 Quarters
  if (horizon === "4q") {
    const totalSubmissions = 284;
    const approvedCount = 223;
    const revisionCount = 45;
    const rejectedCount = 15;
    const totalReviewed = approvedCount + revisionCount + rejectedCount;

    const kpis: OperationalKPIs = {
      totalSubmissions,
      totalSubmissionsDeltaPct: 15.1,
      approvalRatePct: 78.8,
      approvalRateDeltaPct: 2.3,
      revisionRatePct: 15.9,
      revisionRateDeltaPct: -1.5,
      rejectionRatePct: 5.3,
      rejectionRateDeltaPct: -0.8,
      medianTurnaroundHours: 4.1,
      firstPassClearanceRatePct: 63.0,
      slaCompliancePct: 96.5,
    };

    return {
      timeHorizon: "4q",
      kpis,
      timeSeries: QUARTERLY_SERIES_4Q,
      outcomeDistribution: {
        approvedCount,
        approvedPct: 78.8,
        revisionCount,
        revisionPct: 15.9,
        rejectedCount,
        rejectedPct: 5.3,
        totalReviewed,
      },
      categoryBreakdown: CATEGORIES_BREAKDOWN_12M,
      turnaroundTiers: TURNAROUND_TIERS_12M,
    };
  }

  // 8 Quarters
  if (horizon === "8q") {
    const totalSubmissions = 527;
    const approvedCount = 410;
    const revisionCount = 88;
    const rejectedCount = 28;
    const totalReviewed = approvedCount + revisionCount + rejectedCount;

    const kpis: OperationalKPIs = {
      totalSubmissions,
      totalSubmissionsDeltaPct: 18.2,
      approvalRatePct: 78.0,
      approvalRateDeltaPct: 2.1,
      revisionRatePct: 16.7,
      revisionRateDeltaPct: -1.2,
      rejectionRatePct: 5.3,
      rejectionRateDeltaPct: -0.9,
      medianTurnaroundHours: 4.4,
      firstPassClearanceRatePct: 62.1,
      slaCompliancePct: 96.1,
    };

    return {
      timeHorizon: "8q",
      kpis,
      timeSeries: QUARTERLY_SERIES_8Q,
      outcomeDistribution: {
        approvedCount,
        approvedPct: 78.0,
        revisionCount,
        revisionPct: 16.7,
        rejectedCount,
        rejectedPct: 5.3,
        totalReviewed,
      },
      categoryBreakdown: CATEGORIES_BREAKDOWN_12M.map((c) => ({
        ...c,
        totalSubmissions: Math.round(c.totalSubmissions * 1.85),
        approvedCount: Math.round(c.approvedCount * 1.85),
        revisionCount: Math.round(c.revisionCount * 1.85),
        rejectedCount: Math.round(c.rejectedCount * 1.85),
      })),
      turnaroundTiers: [
        { rangeLabel: "< 2 Hours", description: "Rapid pass-through", count: 215, percentage: 40.8, color: "#2575bc" },
        { rangeLabel: "2 – 6 Hours", description: "Standard review", count: 191, percentage: 36.2, color: "#1e4c77" },
        { rangeLabel: "6 – 24 Hours", description: "Multi-flag review", count: 98, percentage: 18.6, color: "#4a9ae1" },
        { rangeLabel: "> 24 Hours", description: "Complex escalation", count: 23, percentage: 4.4, color: "#0f2b48" },
      ],
    };
  }

  // 3 Years
  if (horizon === "3y") {
    const totalSubmissions = 583;
    const approvedCount = 451;
    const revisionCount = 100;
    const rejectedCount = 31;
    const totalReviewed = approvedCount + revisionCount + rejectedCount;

    const kpis: OperationalKPIs = {
      totalSubmissions,
      totalSubmissionsDeltaPct: 24.5,
      approvalRatePct: 77.5,
      approvalRateDeltaPct: 1.7,
      revisionRatePct: 17.2,
      revisionRateDeltaPct: -0.9,
      rejectionRatePct: 5.3,
      rejectionRateDeltaPct: -0.8,
      medianTurnaroundHours: 4.6,
      firstPassClearanceRatePct: 61.4,
      slaCompliancePct: 95.8,
    };

    return {
      timeHorizon: "3y",
      kpis,
      timeSeries: YEARLY_SERIES_3Y,
      outcomeDistribution: {
        approvedCount,
        approvedPct: 77.5,
        revisionCount,
        revisionPct: 17.2,
        rejectedCount,
        rejectedPct: 5.3,
        totalReviewed,
      },
      categoryBreakdown: CATEGORIES_BREAKDOWN_12M.map((c) => ({
        ...c,
        totalSubmissions: Math.round(c.totalSubmissions * 2.05),
        approvedCount: Math.round(c.approvedCount * 2.05),
        revisionCount: Math.round(c.revisionCount * 2.05),
        rejectedCount: Math.round(c.rejectedCount * 2.05),
      })),
      turnaroundTiers: [
        { rangeLabel: "< 2 Hours", description: "Rapid pass-through", count: 236, percentage: 40.5, color: "#2575bc" },
        { rangeLabel: "2 – 6 Hours", description: "Standard review", count: 211, percentage: 36.2, color: "#1e4c77" },
        { rangeLabel: "6 – 24 Hours", description: "Multi-flag review", count: 110, percentage: 18.9, color: "#4a9ae1" },
        { rangeLabel: "> 24 Hours", description: "Complex escalation", count: 26, percentage: 4.4, color: "#0f2b48" },
      ],
    };
  }

  // Default: 12 Months
  const totalSubmissions = 284;
  const approvedCount = 223;
  const revisionCount = 46;
  const rejectedCount = 15;
  const totalReviewed = approvedCount + revisionCount + rejectedCount;

  const kpis: OperationalKPIs = {
    totalSubmissions,
    totalSubmissionsDeltaPct: 14.2,
    approvalRatePct: 78.5,
    approvalRateDeltaPct: 2.4,
    revisionRatePct: 16.2,
    revisionRateDeltaPct: -1.6,
    rejectionRatePct: 5.3,
    rejectionRateDeltaPct: -0.8,
    medianTurnaroundHours: 4.2,
    firstPassClearanceRatePct: 62.8,
    slaCompliancePct: 96.4,
  };

  return {
    timeHorizon: "12m",
    kpis,
    timeSeries: MONTHLY_SERIES_12M,
    outcomeDistribution: {
      approvedCount,
      approvedPct: 78.5,
      revisionCount,
      revisionPct: 16.2,
      rejectedCount,
      rejectedPct: 5.3,
      totalReviewed,
    },
    categoryBreakdown: CATEGORIES_BREAKDOWN_12M,
    turnaroundTiers: TURNAROUND_TIERS_12M,
  };
}
