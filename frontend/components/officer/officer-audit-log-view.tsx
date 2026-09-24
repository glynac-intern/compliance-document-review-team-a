"use client";

import * as React from "react";
import {
  Search,
  ChevronDown,
  Download,
  History,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Eye,
  Bell,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { auditApi, type AuditLogEntry } from "@/lib/audit-api";
import { cn } from "@/lib/utils";

interface OfficerAuditLogViewProps {
  onShowToast?: (msg: string) => void;
}

// TA-106: matches the action types GET /audit can actually produce
// (see backend/audit/router.py) -- there is no tracked "AI scan
// completed" or "file downloaded" AuditEvent today, so those categories
// were dropped rather than left as filters that can never match anything.
const ACTION_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All Events" },
  { value: "decisions", label: "Decisions" },
  { value: "submissions", label: "Submissions" },
  { value: "views", label: "Views" },
  { value: "reminders", label: "Reminders" },
];

function formatAuditTimestamp(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toISOString().replace("T", " ").slice(0, 16);
  } catch {
    return isoString;
  }
}

export function OfficerAuditLogView({ onShowToast }: OfficerAuditLogViewProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [entries, setEntries] = React.useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);

  const fetchAuditLog = React.useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const data = await auditApi.getAuditLog();
      setEntries(data);
    } catch (err) {
      console.error("Failed to load audit log:", err);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchAuditLog();
  }, [fetchAuditLog]);

  const filteredEntries = React.useMemo(() => {
    let result = [...entries];

    // Category filter
    if (categoryFilter === "decisions") {
      result = result.filter((e) =>
        ["DECISION_APPROVED", "DECISION_REVISION", "DECISION_REJECTED"].includes(e.action_type)
      );
    } else if (categoryFilter === "submissions") {
      result = result.filter((e) =>
        ["DOCUMENT_SUBMITTED", "REVISION_UPLOADED"].includes(e.action_type)
      );
    } else if (categoryFilter === "views") {
      result = result.filter((e) => e.action_type === "DOCUMENT_VIEWED");
    } else if (categoryFilter === "reminders") {
      result = result.filter((e) => e.action_type === "REMINDER_SENT");
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
  }, [entries, categoryFilter, searchQuery]);

  const handleExport = () => {
    const csvRows = [
      [
        "Event ID",
        "Timestamp",
        "User",
        "Role",
        "Action",
        "Document ID",
        "Document Title",
        "Details",
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
      ]),
    ];

    const csvContent =
      "data:text/csv;charset=utf-8," + csvRows.map((r) => r.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `audit_log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onShowToast?.("Audit trail exported to CSV.");
  };

  const renderActionBadge = (action: AuditLogEntry["action_type"]) => {
    switch (action) {
      case "DECISION_APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-normal text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
            <CheckCircle2 className="h-3 w-3 stroke-[2]" />
            Approved
          </span>
        );
      case "DECISION_REVISION":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-normal text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60">
            <AlertTriangle className="h-3 w-3 stroke-[2]" />
            Revision
          </span>
        );
      case "DECISION_REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold text-red-800 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60">
            <XCircle className="h-3 w-3 stroke-[2.2]" />
            Rejected
          </span>
        );
      case "DOCUMENT_SUBMITTED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-normal text-[#1e4c77] dark:text-[#7fb2e3] bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60">
            <FileText className="h-3 w-3 stroke-[1.8]" />
            Submitted
          </span>
        );
      case "REVISION_UPLOADED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-normal text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60">
            <RefreshCw className="h-3 w-3 stroke-[1.8]" />
            Resubmission
          </span>
        );
      case "DOCUMENT_VIEWED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-normal text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <Eye className="h-3 w-3 stroke-[1.8]" />
            Viewed
          </span>
        );
      case "REMINDER_SENT":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-normal text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60">
            <Bell className="h-3 w-3 stroke-[1.8]" />
            Reminder
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-normal text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            {action}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 font-inter select-none">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-normal text-slate-800 dark:text-slate-100 tracking-tight font-inter">
            Audit Log
          </h1>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            type="button"
            onClick={fetchAuditLog}
            disabled={isLoading}
            title="Refresh audit log"
            className="h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors shadow-2xs cursor-pointer flex items-center justify-center disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 stroke-[1.8]", isLoading && "animate-spin")} />
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isLoading || filteredEntries.length === 0}
            className="h-9 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-slate-100 transition-colors shadow-2xs cursor-pointer flex items-center gap-2 font-inter disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 stroke-[1.8]" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filter Toolbar & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search audit log..."
            className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-inter transition-all focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[#1e4c77] dark:focus:ring-[#7fb2e3]/40 focus:bg-white dark:focus:bg-slate-800"
          />
        </div>

        {/* Category Filter */}
        <div className="relative">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 pl-3 pr-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 font-inter appearance-none cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-[#1e4c77] dark:focus:ring-[#7fb2e3]/40 focus:border-transparent transition-all"
          >
            {ACTION_FILTERS.map((f) => (
              <option key={f.value} value={f.value} className="dark:bg-slate-800 dark:text-slate-100">
                {f.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
        </div>
      </div>

      {/* Audit Trail Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
        {hasError ? (
          <div className="p-12 text-center font-inter">
            <AlertCircle className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Unable to load audit log</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 mb-4">
              The audit service encountered an error.
            </p>
            <button
              type="button"
              onClick={fetchAuditLog}
              className="h-8 px-4 rounded-lg bg-[#1e4c77] text-white text-xs font-medium transition-all hover:bg-[#163c60] cursor-pointer shadow-xs"
            >
              Retry
            </button>
          </div>
        ) : isLoading ? (
          <div className="p-12 text-center font-inter">
            <RefreshCw className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-3 animate-spin" />
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Loading audit log...</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-12 text-center font-inter">
            <History className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">No events found</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {entries.length === 0 ? "No audit events have been recorded yet." : "Try adjusting your search or filter."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-xs font-inter">
            <thead>
              <tr className="bg-[#f8fafc]/90 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <th className="text-left py-3.5 px-4 text-[12px] font-normal text-slate-400 dark:text-slate-400 tracking-normal w-[150px]">
                  Timestamp
                </th>
                <th className="text-left py-3.5 px-4 text-[12px] font-normal text-slate-400 dark:text-slate-400 tracking-normal w-[130px]">
                  Action
                </th>
                <th className="text-left py-3.5 px-4 text-[12px] font-normal text-slate-400 dark:text-slate-400 tracking-normal w-[170px]">
                  User
                </th>
                <th className="text-left py-3.5 px-4 text-[12px] font-normal text-slate-400 dark:text-slate-400 tracking-normal min-w-[220px] max-w-[320px]">
                  Document
                </th>
                <th className="text-left py-3.5 px-4 text-[12px] font-normal text-slate-400 dark:text-slate-400 tracking-normal min-w-[280px]">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                  {/* Timestamp */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="font-numbers tabular-nums text-slate-600 dark:text-slate-400 font-medium text-[11.5px]">
                      {formatAuditTimestamp(entry.timestamp)}
                    </span>
                  </td>

                  {/* Action Badge */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {renderActionBadge(entry.action_type)}
                  </td>

                  {/* User */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <p className="text-[12.5px] font-medium text-slate-800 dark:text-slate-200 font-inter">
                      {entry.actor_name}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-inter">
                      {entry.actor_role}
                    </p>
                  </td>

                  {/* Document */}
                  <td className="py-3.5 px-4 min-w-[220px] max-w-[320px]">
                    <p className="text-[12.5px] font-normal text-slate-800 dark:text-slate-200 font-inter leading-snug" title={entry.document_title}>
                      {entry.document_title}
                    </p>
                  </td>

                  {/* Details */}
                  <td className="py-3.5 px-4">
                    <p className="text-[12px] text-slate-600 dark:text-slate-400 font-inter leading-relaxed" title={entry.details}>
                      {entry.details}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Results Count */}
      {!isLoading && !hasError && filteredEntries.length > 0 && (
        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-inter">
          Showing{" "}
          <span className="font-numbers tabular-nums font-medium text-slate-500 dark:text-slate-400">
            {filteredEntries.length}
          </span>{" "}
          of{" "}
          <span className="font-numbers tabular-nums font-medium text-slate-500 dark:text-slate-400">
            {entries.length}
          </span>{" "}
          events
        </p>
      )}
    </div>
  );
}
