"use client";

/**
 * Document Preview Viewer — Powered by Open-Source Document Viewer APIs.
 *
 * Uses the native browser / PDF.js embedded viewer engine for PDFs:
 * - Native pagination, thumbnails, zoom (fit width/height), and text search
 * - Zero handwritten custom zoom/page button boilerplate
 * - Direct external pop-out and download capabilities
 * - Minimalistic, theme-consistent regulatory findings view (#1e4c77)
 */

import * as React from "react";
import {
  ExternalLink,
  FileSpreadsheet,
  Download,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE_URL, getStoredToken } from "@/lib/api-client";

// ---------------------------------------------------------------------------
// Types & Props
// ---------------------------------------------------------------------------

export interface DocumentPreviewViewerProps {
  documentId: string;
  title: string;
  docType?: string;
  fileSizeMb?: number;
  uploadedAt?: string;
  advisorName?: string;
  activeFlagIndex?: number | null;
  onSelectFlag?: (index: number) => void;
  onDownload?: () => void;
}

// Map document title/id to the converted seed static assets
function getStaticDocumentUrl(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes("alpha") || lower.includes("presentation")) return "/documents/doc_002.pdf";
  if (lower.includes(".docx") || lower.includes("newsletter") || lower.includes("letter")) return "/documents/doc_006.docx";
  if (lower.includes(".xlsx") || lower.includes("income") || lower.includes("sheet")) return "/documents/doc_011.xlsx";
  return "/documents/doc_001.pdf";
}

function detectFormat(title: string, docType?: string): "pdf" | "docx" | "xlsx" {
  const lower = (title + " " + (docType ?? "")).toLowerCase();
  if (lower.includes(".xlsx") || lower.includes("sheet") || lower.includes("excel")) return "xlsx";
  if (lower.includes(".docx") || lower.includes("letter") || lower.includes("word")) return "docx";
  return "pdf";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DocumentPreviewViewer({
  documentId,
  title,
  docType,
  advisorName,
  onDownload,
}: DocumentPreviewViewerProps) {
  const format = detectFormat(title, docType);
  const staticUrl = getStaticDocumentUrl(title);
  const [blobUrl, setBlobUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(documentId);
    if (!isUuid) return;

    let ignore = false;
    let localBlobUrl = "";
    const token = getStoredToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    fetch(`${API_BASE_URL}/documents/${documentId}/file`, { headers })
      .then((res) => {
        if (!res.ok) throw new Error("Could not load file");
        return res.blob();
      })
      .then((blob) => {
        if (!ignore) {
          localBlobUrl = URL.createObjectURL(blob);
          setBlobUrl(localBlobUrl);
        }
      })
      .catch(() => {
        // Fallback to static demo file
      });

    return () => {
      ignore = true;
      if (localBlobUrl) URL.revokeObjectURL(localBlobUrl);
    };
  }, [documentId]);

  const fileUrl = blobUrl || staticUrl;

  return (
    <div className="flex flex-col h-full bg-slate-50 border-r border-slate-200 overflow-hidden font-inter">
      {/* ===== MINIMALIST TOOLBAR ===== */}
      <div className="h-10 bg-white border-b border-slate-200 px-3.5 flex items-center justify-between shrink-0 shadow-2xs">
        {/* Left: Document format & title */}
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={cn(
              "px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase font-inter shrink-0",
              format === "pdf" && "bg-[#1e4c77]/10 text-[#1e4c77] border border-[#1e4c77]/20",
              format === "docx" && "bg-blue-50 text-blue-700 border border-blue-200",
              format === "xlsx" && "bg-emerald-50 text-emerald-700 border border-emerald-200"
            )}
          >
            {format.toUpperCase()}
          </span>

          <span className="text-[12px] font-medium text-slate-800 truncate max-w-[280px] sm:max-w-[420px]">
            {title}
          </span>
        </div>

        {/* Right: Actions (Download & Pop Out) */}
        <div className="flex items-center gap-1.5">
          {onDownload && (
            <button
              type="button"
              onClick={onDownload}
              className="h-7 w-7 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-[#1e4c77] hover:border-slate-300 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
              title="Download original file"
              aria-label="Download original file"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
          )}
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="h-7 w-7 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-[#1e4c77] hover:border-slate-300 flex items-center justify-center transition-colors shadow-2xs"
            title="Open document in new tab"
            aria-label="Open document in new tab"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* ===== DOCUMENT DISPLAY AREA ===== */}
      <div className="flex-1 overflow-hidden relative">
        {/* 1. NATIVE OPEN-SOURCE PDF VIEWER ENGINE (AUTOMATICALLY OPENS BY DEFAULT) */}
        {format === "pdf" && (
          <iframe
            src={`${fileUrl}#toolbar=1&navpanes=1&view=FitH`}
            className="w-full h-full border-0 bg-slate-100"
            title="Document Preview"
          />
        )}

        {/* 2. DOCX VIEW (SIMPLE FORMATTED) */}
        {format === "docx" && (
          <div className="h-full overflow-y-auto p-8 max-w-2xl text-slate-800 font-inter">
            <div className="mb-6">
              <h1 className="text-lg font-semibold text-slate-900 font-inter">{title}</h1>
              <p className="text-xs text-slate-500 mt-1 font-inter">
                Advisor: <span className="font-medium text-slate-700 font-inter">{advisorName ?? "Elena Rostova"}</span>
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold text-[#1e4c77] font-inter">SEC Form CRS</p>
                <p className="text-xs text-slate-700 mt-1 leading-relaxed font-inter">
                  Newsletter lacks SEC Form CRS disclosure in footer. Contains absolute language regarding tax certainty.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 3. XLSX SPREADSHEET VIEW */}
        {format === "xlsx" && (
          <div className="h-full overflow-y-auto p-6 flex justify-center bg-slate-50/70">
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 max-w-[800px] w-full min-h-[600px] overflow-hidden flex flex-col">
              <div className="bg-[#1e4c77] text-white px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-slate-200" />
                  <span className="text-xs font-bold font-inter">{title}</span>
                </div>
                <span className="text-[10px] bg-[#163c60] px-2 py-0.5 rounded font-mono">XLSX MODEL</span>
              </div>

              <div className="overflow-x-auto p-2">
                <table className="w-full text-[11px] border-collapse font-numbers tabular-nums">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-mono text-[10px] border-b border-slate-300">
                      <th className="p-1.5 text-left border-r border-slate-200">Security ID</th>
                      <th className="p-1.5 text-left border-r border-slate-200">Asset Name</th>
                      <th className="p-1.5 text-right border-r border-slate-200">Duration</th>
                      <th className="p-1.5 text-right border-r border-slate-200">Yield %</th>
                      <th className="p-1.5 text-right border-r border-slate-200">Allocation</th>
                      <th className="p-1.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr>
                      <td className="p-1.5 font-mono text-slate-600 border-r border-slate-200">SEC-9012</td>
                      <td className="p-1.5 font-medium border-r border-slate-200">US Treasury 10Y Note</td>
                      <td className="p-1.5 text-right border-r border-slate-200">8.4 yrs</td>
                      <td className="p-1.5 text-right font-medium text-emerald-700 border-r border-slate-200">4.28%</td>
                      <td className="p-1.5 text-right border-r border-slate-200">35.0%</td>
                      <td className="p-1.5 text-center"><span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold">APPROVED</span></td>
                    </tr>
                    <tr className="bg-slate-50/50">
                      <td className="p-1.5 font-mono text-slate-600 border-r border-slate-200">SEC-9018</td>
                      <td className="p-1.5 font-medium border-r border-slate-200">Investment Grade Corp Index</td>
                      <td className="p-1.5 text-right border-r border-slate-200">6.1 yrs</td>
                      <td className="p-1.5 text-right font-medium text-emerald-700 border-r border-slate-200">5.45%</td>
                      <td className="p-1.5 text-right border-r border-slate-200">25.0%</td>
                      <td className="p-1.5 text-center"><span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold">APPROVED</span></td>
                    </tr>
                    <tr className="bg-slate-50/80 border-y border-slate-200">
                      <td className="p-1.5 font-mono text-slate-700 border-r border-slate-200">SEC-9088</td>
                      <td className="p-1.5 font-semibold text-slate-900 border-r border-slate-200">High Yield Debt Tranche (Missing Benchmark Disclosure)</td>
                      <td className="p-1.5 text-right border-r border-slate-200">4.1 yrs</td>
                      <td className="p-1.5 text-right font-bold text-slate-700 border-r border-slate-200">9.15%</td>
                      <td className="p-1.5 text-right border-r border-slate-200">20.0%</td>
                      <td className="p-1.5 text-center"><span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">AUDIT NOTE</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 4. UNRENDERABLE DOCUMENT FALLBACK (TA-67) */}
        {!["pdf", "docx", "xlsx"].includes(format) && (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-slate-50 font-inter">
            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <FileText className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-slate-800">Preview Not Available In Browser</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mb-4">
              This document format cannot be rendered directly in the preview window. You can download the original file to inspect it.
            </p>
            {onDownload && (
              <button
                type="button"
                onClick={onDownload}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1e4c77] hover:bg-[#163e63] text-white text-xs font-medium transition-all shadow-xs cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>Download Original Document</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
