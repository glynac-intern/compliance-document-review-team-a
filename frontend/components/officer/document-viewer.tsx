"use client";

import * as React from "react";
import { ZoomIn, ZoomOut, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DocumentViewerProps {
  content: string[];
  highlightedPassage: string | null;
}

export function DocumentViewer({ content, highlightedPassage }: DocumentViewerProps) {
  const [page, setPage] = React.useState(1);
  const [zoom, setZoom] = React.useState(100);
  const totalPages = Math.ceil(content.length / 4);
  const pageContent = content.slice((page - 1) * 4, page * 4);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-1.5 bg-slate-50/80 shrink-0">
        <div className="flex items-center gap-1 text-[11px] text-slate-500">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="p-0.5 rounded hover:bg-slate-200 disabled:opacity-30">
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="tabular-nums font-mono">{page}/{totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="p-0.5 rounded hover:bg-slate-200 disabled:opacity-30">
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom(Math.max(80, zoom - 10))} className="p-1 rounded hover:bg-slate-200 text-slate-500">
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="text-[10px] text-slate-400 tabular-nums w-8 text-center">{zoom}%</span>
          <button onClick={() => setZoom(Math.min(150, zoom + 10))} className="p-1 rounded hover:bg-slate-200 text-slate-500">
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <div className="w-px h-3 bg-slate-200 mx-1" />
          <button className="p-1 rounded hover:bg-slate-200 text-slate-500" title="Download">
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Document canvas */}
      <div className="flex-1 overflow-y-auto p-4 bg-white" style={{ fontSize: `${zoom}%` }}>
        <div className="max-w-prose mx-auto space-y-3">
          {pageContent.map((line, i) => {
            const isHeading = line === line.toUpperCase() || line.startsWith("Section");
            const isHighlighted = highlightedPassage && line.toLowerCase().includes(highlightedPassage.toLowerCase().slice(0, 40));

            return (
              <p
                key={i}
                className={cn(
                  "text-[13px] leading-relaxed text-slate-800",
                  isHeading && "text-[14px] font-semibold text-slate-900 mt-4",
                  isHighlighted && "bg-amber-100 border-l-2 border-amber-400 pl-2 py-0.5 rounded-r-sm"
                )}
              >
                {line}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
}
