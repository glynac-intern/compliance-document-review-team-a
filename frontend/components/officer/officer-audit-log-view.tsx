"use client";

import * as React from "react";
import {
  Search,
  ChevronDown,
  Download,
  History,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Cpu,
  ArrowDownToLine,
  RefreshCw,
} from "lucide-react";
import {
  MOCK_AUDIT_LOG_ENTRIES,
  type AuditLogEntry,
} from "@/lib/mock-officer-data";

interface OfficerAuditLogViewProps {
  onShowToast?: (msg: string) => void;
}

const ACTION_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All Audit Events" },
  { value: "decisions", label: "Regulatory Decisions" },
  { value: "submissions", label: "Document Submissions" },
  { value: "ai_scans", label: "AI Screening Runs" },
  { value: "access", label: "File Access & Downloads" },
];

function formatAuditTimestamp(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC").slice(0, 19) + " UTC";
  } catch {
    return isoString;
  }
}

export function OfficerAuditLogView({ onShowToast }: OfficerAuditLogViewProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("all");

  const filteredEntries = React.useMemo(() => {
    let result = [...MOCK_AUDIT_LOG_ENTRIES];

    // Category filter
    if (categoryFilter === "decisions") {
      result = result.filter((e) =>
        ["DECISION_APPROVED", "DECISION_REVISION", "DECISION_REJECTED"].includes(e.action_type)
      );
    } else if (categoryFilter === "submissions") {
      result = result.filter((e) =>
        ["DOCUMENT_SUBMITTED", "REVISION_UPLOADED"].includes(e.action_type)
      );
    } else if (categoryFilter === "ai_scans") {
      result = result.filter((e) => e.action_type === "AI_SCAN_COMPLETED");
    } else if (categoryFilter === "access") {
      result = result.filter((e) => e.action_type === "FILE_DOWNLOADED");
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.id.toLowerCase().includes(q) ||
          e.actor_name.toLowerCase().includes(q) ||
          e.document_id.toLowerCase().includes(q) ||
          e.document_title.toLowerCase().includes(q) ||
          e.details.toLowerCase().includes(q) ||
          e.action_type.toLowerCase().includes(q)
      );
    }

    return result;
  }, [categoryFilter, searchQuery]);

  const handleExport = () => {
    const csvRows = [
      [
        "Event ID",
        "Timestamp (UTC)",
        "Actor Name",
        "Actor Role",
        "Action Type",
        "Document ID",
        "Document Title",
        "Details",
        "IP Address",
        "Ledger Signature",
      ],
      ...filteredEntries.map((e) => [
        e.id,
        formatAuditTimestamp(e.timestamp),
        e.actor_name,
        e.actor_role,
        e.action_type,
        e.document_id,
        `"${e.document_title.replace(/"/g, '""')}"`,
        `"${e.details.replace(/"/g, '""')}"`,
        e.ip_address,
        e.hash_signature,
      ]),
    ];

    const csvContent =
      "data:text/csv;charset=utf-8," + csvRows.map((r) => r.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `verity_compliance_audit_trail_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onShowToast?.("Compliance audit trail exported to CSV.");
  };

  const renderActionBadge = (action: AuditLogEntry["action_type"]) => {
    switch (action) {
      case "DECISION_APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-normal text-emerald-800 bg-emerald-50 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3 stroke-[2]" />
            Approved
          </span>
        );
      case "DECISION_REVISION":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-normal text-amber-800 bg-amber-50 border border-amber-200">
            <AlertTriangle className="h-3 w-3 stroke-[2]" />
            Revision Required
          </span>
        );
      case "DECISION_REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold text-red-800 bg-red-50 border border-red-200">
            <XCircle className="h-3 w-3 stroke-[2.2]" />
            Rejected
          </span>
        );
      case "DOCUMENT_SUBMITTED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-normal text-[#1e4c77] bg-blue-50 border border-blue-200">
            <FileText className="h-3 w-3 stroke-[1.8]" />
            Submitted
          </span>
        );
      case "REVISION_UPLOADED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-normal text-indigo-700 bg-indigo-50 border border-indigo-200">
            <RefreshCw className="h-3 w-3 stroke-[1.8]" />
            Resubmission
          </span>
        );
      case "AI_SCAN_COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-normal text-purple-700 bg-purple-50 border border-purple-200">
            <Cpu className="h-3 w-3 stroke-[1.8]" />
            AI Screening
          </span>
        );
      case "FILE_DOWNLOADED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-normal text-slate-700 bg-slate-100 border border-slate-200">
            <ArrowDownToLine className="h-3 w-3 stroke-[1.8]" />
            File Access
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-normal text-slate-600 bg-slate-100 border border-slate-200">
            {action}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 font-inter select-none">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-normal text-slate-800 tracking-tight font-inter">
            Audit Log
          </h1>
          <p className="text-xs text-slate-400 font-normal font-inter mt-1">
            Immutable cross-firm event ledger complying with SEC Rule 204-2 & FINRA Rule 4511 books and records mandates.
          </p>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleExport}
            className="h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer flex items-center gap-2 font-inter"
          >
            <Download className="h-3.5 w-3.5 text-slate-500 stroke-[1.8]" />
            Export Audit Trail (CSV)
          </button>
        </div>
      </div>

      {/* Filter Toolbar & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by event, actor, document ID, or action..."
            className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 font-inter transition-all focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[#1e4c77] focus:bg-white"
          />
        </div>

        {/* Category Filter */}
        <div className="relative">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 pl-3 pr-8 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 font-inter appearance-none cursor-pointer hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1e4c77] focus:border-transparent transition-all"
          >
            {ACTION_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        </div>

        <div className="ml-auto hidden md:flex items-center gap-2 text-xs text-slate-400 font-inter">
          <ShieldCheck className="h-4 w-4 text-emerald-600 stroke-[1.8]" />
          <span>SHA-256 Ledger Verified</span>
        </div>
      </div>

      {/* Audit Trail Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        {filteredEntries.length === 0 ? (
          <div className="p-12 text-center font-inter">
            <History className="h-8 w-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-800">No audit events match</p>
            <p className="text-xs text-slate-400 mt-1">
              Try modifying your search keywords or event category filter.
            </p>
          </div>
        ) : (
          <table className="w-full text-xs font-inter">
            <thead>
              <tr className="bg-[#f8fafc]/90 border-b border-slate-100">
                <th className="text-left py-3 px-4 text-[12px] font-normal text-slate-400 tracking-normal">
                  Timestamp (UTC)
                </th>
                <th className="text-left py-3 px-4 text-[12px] font-normal text-slate-400 tracking-normal">
                  Action Event
                </th>
                <th className="text-left py-3 px-4 text-[12px] font-normal text-slate-400 tracking-normal">
                  Actor & Role
                </th>
                <th className="text-left py-3 px-4 text-[12px] font-normal text-slate-400 tracking-normal">
                  Target Document
                </th>
                <th className="text-left py-3 px-4 text-[12px] font-normal text-slate-400 tracking-normal">
                  Regulatory Audit Details
                </th>
                <th className="text-right py-3 px-4 text-[12px] font-normal text-slate-400 tracking-normal">
                  Node / Signature
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Timestamp */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="font-numbers tabular-nums text-slate-600 font-medium text-[11.5px]">
                      {formatAuditTimestamp(entry.timestamp)}
                    </span>
                  </td>

                  {/* Action Badge */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {renderActionBadge(entry.action_type)}
                  </td>

                  {/* Actor */}
                  <td className="py-3.5 px-4">
                    <p className="text-[12.5px] font-medium text-slate-800 font-inter">
                      {entry.actor_name}
                    </p>
                    <p className="text-[11px] text-slate-400 font-inter">
                      {entry.actor_role}
                    </p>
                  </td>

                  {/* Target Document */}
                  <td className="py-3.5 px-4 max-w-[220px]">
                    <p className="text-[12.5px] font-normal text-slate-800 truncate font-inter" title={entry.document_title}>
                      {entry.document_title}
                    </p>
                    <p className="text-[10.5px] text-slate-400 font-numbers tabular-nums mt-0.5">
                      {entry.document_id}
                    </p>
                  </td>

                  {/* Details */}
                  <td className="py-3.5 px-4 max-w-[320px]">
                    <p className="text-[12px] text-slate-600 font-inter leading-relaxed" title={entry.details}>
                      {entry.details}
                    </p>
                  </td>

                  {/* Node / Signature */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <p className="font-numbers tabular-nums text-[11px] text-slate-500">
                      {entry.ip_address}
                    </p>
                    <p className="font-numbers tabular-nums text-[10px] text-slate-400 mt-0.5 tracking-tight font-mono">
                      {entry.hash_signature}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Results Count */}
      {filteredEntries.length > 0 && (
        <p className="text-[11px] text-slate-400 font-inter">
          Showing{" "}
          <span className="font-numbers tabular-nums font-medium text-slate-500">
            {filteredEntries.length}
          </span>{" "}
          of{" "}
          <span className="font-numbers tabular-nums font-medium text-slate-500">
            {MOCK_AUDIT_LOG_ENTRIES.length}
          </span>{" "}
          regulatory events
        </p>
      )}
    </div>
  );
}
