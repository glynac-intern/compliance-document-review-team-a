import { DocumentType } from "./compliance";

export type AnalyticsTimeHorizon =
  | "30d"
  | "90d"
  | "6m"
  | "12m"
  | "4q"
  | "8q"
  | "ytd"
  | "3y";

export interface TimeSeriesPoint {
  periodKey: string;
  label: string;
  sublabel?: string;
  total: number;
  approved: number;
  needsRevision: number;
  rejected: number;
  pending: number;
  approvalRatePct: number;
}

export interface OutcomeDistribution {
  approvedCount: number;
  approvedPct: number;
  revisionCount: number;
  revisionPct: number;
  rejectedCount: number;
  rejectedPct: number;
  totalReviewed: number;
}

export interface CategoryMetric {
  type: DocumentType;
  totalSubmissions: number;
  approvedCount: number;
  revisionCount: number;
  rejectedCount: number;
  clearanceRatePct: number;
  avgTurnaroundHours: number;
}

export interface TurnaroundTier {
  rangeLabel: string;
  description: string;
  count: number;
  percentage: number;
  color: string;
}

export interface OperationalKPIs {
  totalSubmissions: number;
  totalSubmissionsDeltaPct: number;
  approvalRatePct: number;
  approvalRateDeltaPct: number;
  revisionRatePct: number;
  revisionRateDeltaPct: number;
  rejectionRatePct: number;
  rejectionRateDeltaPct: number;
  medianTurnaroundHours: number;
  firstPassClearanceRatePct: number;
  slaCompliancePct: number;
}

export interface AnalyticsDataSet {
  timeHorizon: AnalyticsTimeHorizon;
  kpis: OperationalKPIs;
  timeSeries: TimeSeriesPoint[];
  outcomeDistribution: OutcomeDistribution;
  categoryBreakdown: CategoryMetric[];
  turnaroundTiers: TurnaroundTier[];
}
