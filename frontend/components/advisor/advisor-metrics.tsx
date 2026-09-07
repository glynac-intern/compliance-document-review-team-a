import * as React from "react";
import { MetricCard } from "@/components/common/metric-card";
import { FileText, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { ComplianceDocument } from "@/types/compliance";

interface AdvisorMetricsProps {
  documents: ComplianceDocument[];
}

export function AdvisorMetrics({ documents }: AdvisorMetricsProps) {
  const total = documents.length;
  const pending = documents.filter(
    (d) => d.status === "pending" || d.status === "in_review"
  ).length;
  const needsRevision = documents.filter(
    (d) => d.status === "needs_revision"
  ).length;
  const approved = documents.filter((d) => d.status === "approved").length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      <MetricCard
        title="Total Submissions"
        value={total}
        trend={{ value: "+3 this week", isPositive: true }}
        description="Active client-facing assets"
        icon={FileText}
      />
      <MetricCard
        title="Pending Officer Review"
        value={pending}
        trend={{ value: "Avg 14h SLA", isNeutral: true }}
        description="Awaiting compliance officer action"
        icon={Clock}
      />
      <MetricCard
        title="Requires Revision"
        value={needsRevision}
        trend={{
          value: needsRevision > 0 ? "Action Required" : "None pending",
          isPositive: needsRevision === 0,
        }}
        description="Officer feedback attached"
        icon={AlertTriangle}
        className={needsRevision > 0 ? "border-amber-300 bg-amber-50/20" : undefined}
      />
      <MetricCard
        title="Approved Assets"
        value={approved}
        trend={{ value: `${Math.round((approved / (total || 1)) * 100)}% clearance`, isPositive: true }}
        description="Cleared for client distribution"
        icon={CheckCircle2}
      />
    </div>
  );
}
