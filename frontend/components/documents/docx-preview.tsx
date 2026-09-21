"use client";

import * as React from "react";
import {
  FileText,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface DocxPreviewProps {
  data: Blob | ArrayBuffer | string | null | undefined;
  filename?: string;
  onDownload?: () => void;
  className?: string;
}

export function DocxPreview({
  data,
  filename = "document.docx",
  onDownload,
  className = "",
}: DocxPreviewProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [zoom, setZoom] = React.useState<number>(100);

  const renderDocx = React.useCallback(async () => {
    if (!data || !containerRef.current) return;

    setIsLoading(true);
    setError(null);
    containerRef.current.innerHTML = "";

    try {
      let arrayBuffer: ArrayBuffer;

      if (typeof data === "string") {
        const res = await fetch(data);
        if (!res.ok) throw new Error(`Failed to load file (${res.status})`);
        arrayBuffer = await res.arrayBuffer();
      } else if (data instanceof Blob) {
        arrayBuffer = await data.arrayBuffer();
      } else if (data instanceof ArrayBuffer) {
        arrayBuffer = data;
      } else {
        throw new Error("Invalid document data format");
      }

      // Dynamic import to guarantee client-only execution in Next.js
      const { renderAsync } = await import("docx-preview");

      await renderAsync(arrayBuffer, containerRef.current, undefined, {
        className: "docx-preview-body",
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        experimental: true,
        trimXmlDeclaration: true,
        useBase64URL: true,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to parse DOCX document.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [data]);

  React.useEffect(() => {
    renderDocx();
  }, [renderDocx]);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 15, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 15, 60));
  const handleZoomReset = () => setZoom(100);

  return (
    <div className={`flex flex-col h-full w-full bg-slate-100 dark:bg-slate-950 overflow-hidden font-inter select-text ${className}`}>
      {/* ===== Toolbar ===== */}
      <div className="h-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between shrink-0 shadow-2xs z-10">
        <div className="flex items-center gap-2 min-w-0">
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase font-inter bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 flex items-center gap-1 shrink-0">
            <FileText className="h-3 w-3" />
            DOCX
          </span>
          <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate max-w-[240px] sm:max-w-md" title={filename}>
            {filename}
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {/* Zoom controls */}
          <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 p-0.5">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoom <= 60}
              className="h-6 w-6 rounded flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors disabled:opacity-40 cursor-pointer"
              title="Zoom out"
              aria-label="Zoom out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 px-2 font-mono tabular-nums w-12 text-center select-none">
              {zoom}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoom >= 200}
              className="h-6 w-6 rounded flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors disabled:opacity-40 cursor-pointer"
              title="Zoom in"
              aria-label="Zoom in"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleZoomReset}
            className="h-7 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 text-[11px] font-medium transition-colors shadow-2xs cursor-pointer select-none"
            title="Reset Zoom to 100%"
          >
            <RotateCcw className="h-3 w-3" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          {onDownload && (
            <button
              type="button"
              onClick={onDownload}
              className="h-7 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-[#1e4c77] dark:hover:text-[#7fb2e3] flex items-center gap-1.5 text-xs font-medium transition-colors shadow-2xs cursor-pointer ml-1"
              title="Download original file"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Download</span>
            </button>
          )}
        </div>
      </div>

      {/* ===== Content Area ===== */}
      <div className="flex-1 overflow-auto p-4 sm:p-8 flex justify-center relative bg-slate-100/90 dark:bg-slate-950">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 dark:bg-slate-950/80 backdrop-blur-2xs z-20 gap-3">
            <Loader2 className="h-7 w-7 text-[#1e4c77] dark:text-[#7fb2e3] animate-spin" />
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Rendering Word Document...</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center p-8 text-center max-w-md my-auto">
            <AlertCircle className="h-10 w-10 text-rose-500 dark:text-rose-400 mb-3" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Failed to render DOCX</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">{error}</p>
            {onDownload && (
              <button
                type="button"
                onClick={onDownload}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1e4c77] hover:bg-[#163c60] text-white text-xs font-medium transition-all shadow-xs cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                Download to View
              </button>
            )}
          </div>
        )}

        {/* DOCX DOM container */}
        <div
          ref={containerRef}
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: "top center",
            transition: "transform 0.15s ease-out",
          }}
          className={`docx-preview-container max-w-full ${error ? "hidden" : ""}`}
        />
      </div>

      {/* Embedded styles for authentic Word paper layout. The rendered
          page itself stays a literal white sheet with black text in
          both themes -- it's the actual document content (rendered by
          the docx-preview library with its own inline styles), not app
          chrome, and real documents assume a white background the way
          a printed page or an embedded PDF does. Only the toolbar and
          canvas around it are dark-mode aware. */}
      <style jsx global>{`
        .docx-preview-container .docx-wrapper {
          background: transparent !important;
          padding: 0 !important;
        }
        .docx-preview-container .docx-wrapper > section.docx {
          background: #ffffff !important;
          box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -2px rgba(0, 0, 0, 0.04) !important;
          border-radius: 4px !important;
          margin-bottom: 24px !important;
          border: 1px solid #e2e8f0 !important;
          color: #1e293b !important;
          font-family: var(--font-inter), system-ui, -apple-system, sans-serif !important;
        }
        .docx-preview-container table {
          border-collapse: collapse !important;
        }
      `}</style>
    </div>
  );
}
