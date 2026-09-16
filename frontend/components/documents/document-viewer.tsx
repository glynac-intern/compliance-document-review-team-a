"use client";

import * as React from "react";
import { DocxPreview } from "./docx-preview";
import { XlsxPreview } from "./xlsx-preview";
import {
  FileText,
  Download,
  Loader2,
  FileWarning,
} from "lucide-react";

export type SupportedFormat = "pdf" | "docx" | "xlsx" | "unknown";

export interface DocumentViewerProps {
  fileBlob?: Blob | null;
  fileBlobUrl?: string | null;
  fileUrl?: string | null;
  filename?: string;
  docType?: string;
  isLoading?: boolean;
  error?: string | null;
  onDownload?: () => void;
  className?: string;
}

export function detectDocumentFormat(filename?: string, docType?: string): SupportedFormat {
  const name = (filename || "").toLowerCase();
  const type = (docType || "").toLowerCase();

  if (name.endsWith(".xlsx") || name.endsWith(".xls") || type.includes("xlsx") || type.includes("sheet") || type.includes("excel")) {
    return "xlsx";
  }
  if (name.endsWith(".docx") || name.endsWith(".doc") || type.includes("docx") || type.includes("word")) {
    return "docx";
  }
  if (name.endsWith(".pdf") || type.includes("pdf") || type.includes("presentation") || type.includes("deck") || type.includes("commentary")) {
    return "pdf";
  }

  return "unknown";
}

export function DocumentViewer({
  fileBlob,
  fileBlobUrl,
  fileUrl,
  filename = "document",
  docType,
  isLoading = false,
  error = null,
  onDownload,
  className = "",
}: DocumentViewerProps) {
  const format = detectDocumentFormat(filename, docType);
  const activeSource = fileBlob || fileBlobUrl || fileUrl || null;

  if (isLoading) {
    return (
      <div className={`flex flex-col items-center justify-center h-full w-full bg-slate-50 p-8 text-center ${className}`}>
        <Loader2 className="h-8 w-8 text-[#1e4c77] animate-spin mb-3" />
        <p className="text-xs font-medium text-slate-600">Loading document preview...</p>
      </div>
    );
  }

  if (error && !activeSource) {
    return (
      <div className={`flex flex-col items-center justify-center h-full w-full bg-slate-50 p-8 text-center ${className}`}>
        <FileWarning className="h-8 w-8 text-slate-300 mb-3" />
        <h3 className="text-sm font-semibold text-slate-900">Preview Unavailable</h3>
        <p className="text-xs text-slate-500 mt-1 mb-4 max-w-sm">{error}</p>
        {onDownload && (
          <button
            type="button"
            onClick={onDownload}
            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[#1e4c77] rounded-lg px-3 py-2 cursor-pointer hover:bg-[#163c60] transition-colors shadow-xs"
          >
            <Download className="h-3.5 w-3.5" /> Download to view
          </button>
        )}
      </div>
    );
  }

  // 1. PDF Preview
  if (format === "pdf") {
    const pdfSrc = fileBlobUrl || fileUrl;
    if (!pdfSrc) {
      return (
        <div className={`flex flex-col items-center justify-center h-full w-full bg-slate-50 p-8 text-center ${className}`}>
          <FileText className="h-8 w-8 text-slate-300 mb-2" />
          <p className="text-xs text-slate-500">Preparing PDF preview...</p>
        </div>
      );
    }

    return (
      <div className={`flex flex-col h-full w-full bg-slate-100 overflow-hidden ${className}`}>
        <iframe
          src={`${pdfSrc}#toolbar=1&navpanes=1`}
          className="flex-1 w-full h-full border-0"
          title={filename || "PDF Document Preview"}
        />
      </div>
    );
  }

  // 2. DOCX Preview
  if (format === "docx") {
    return (
      <DocxPreview
        data={activeSource}
        filename={filename}
        onDownload={onDownload}
        className={className}
      />
    );
  }

  // 3. XLSX Preview
  if (format === "xlsx") {
    return (
      <XlsxPreview
        data={activeSource}
        filename={filename}
        onDownload={onDownload}
        className={className}
      />
    );
  }

  // 4. Fallback for unrenderable file types
  return (
    <div className={`flex flex-col items-center justify-center h-full w-full bg-slate-50 p-8 text-center ${className}`}>
      <FileWarning className="h-8 w-8 text-slate-300 mb-3" />
      <h3 className="text-sm font-semibold text-slate-900">
        {filename}
      </h3>
      <p className="text-xs text-slate-500 mt-1 mb-4 max-w-sm">
        This file format cannot be previewed inline. Download the original document to view it in your local software.
      </p>
      {onDownload && (
        <button
          type="button"
          onClick={onDownload}
          className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[#1e4c77] rounded-lg px-3 py-2 cursor-pointer hover:bg-[#163c60] transition-colors shadow-xs"
        >
          <Download className="h-3.5 w-3.5" /> Download
        </button>
      )}
    </div>
  );
}
