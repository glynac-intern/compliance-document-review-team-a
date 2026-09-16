"use client";

import * as React from "react";
import * as XLSX from "xlsx";
import {
  FileSpreadsheet,
  Download,
  Loader2,
  AlertCircle,
  Search,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
} from "lucide-react";

interface XlsxPreviewProps {
  data: Blob | ArrayBuffer | string | null | undefined;
  filename?: string;
  onDownload?: () => void;
  className?: string;
}

interface CellInfo {
  row: number;
  col: number;
  coord: string;
  formatted: string;
  raw: unknown;
  formula?: string;
  type: string;
}

export function XlsxPreview({
  data,
  filename = "spreadsheet.xlsx",
  onDownload,
  className = "",
}: XlsxPreviewProps) {
  const [workbook, setWorkbook] = React.useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = React.useState<string[]>([]);
  const [activeSheetName, setActiveSheetName] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Interaction states
  const [selectedCell, setSelectedCell] = React.useState<CellInfo | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [zoom, setZoom] = React.useState(100);

  // Load and parse workbook
  React.useEffect(() => {
    if (!data) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    async function parseWorkbook() {
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
          throw new Error("Invalid spreadsheet data format");
        }

        const wb = XLSX.read(arrayBuffer, {
          type: "array",
          cellDates: true,
          cellStyles: true,
        });

        if (!isMounted) return;

        setWorkbook(wb);
        setSheetNames(wb.SheetNames);
        if (wb.SheetNames.length > 0) {
          setActiveSheetName(wb.SheetNames[0]);
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : "Failed to parse XLSX file.";
        setError(msg);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    parseWorkbook();

    return () => {
      isMounted = false;
    };
  }, [data]);

  // Compute active sheet grid matrix
  const sheetData = React.useMemo(() => {
    if (!workbook || !activeSheetName) return null;

    const sheet = workbook.Sheets[activeSheetName];
    if (!sheet || !sheet["!ref"]) {
      return {
        rows: [],
        cols: [],
        colHeaders: [],
        totalRows: 0,
        totalCols: 0,
        isEmpty: true,
      };
    }

    const range = XLSX.utils.decode_range(sheet["!ref"]);
    const startRow = range.s.r;
    const endRow = Math.min(range.e.r, startRow + 500); // cap to 500 rows for buttery-smooth rendering
    const startCol = range.s.c;
    const endCol = Math.min(range.e.c, startCol + 52); // up to 52 columns

    const colHeaders: string[] = [];
    for (let c = startCol; c <= endCol; c++) {
      colHeaders.push(XLSX.utils.encode_col(c));
    }

    const rows: { rowNum: number; cells: CellInfo[] }[] = [];

    for (let r = startRow; r <= endRow; r++) {
      const cells: CellInfo[] = [];
      for (let c = startCol; c <= endCol; c++) {
        const coord = XLSX.utils.encode_cell({ r, c });
        const cell = sheet[coord];

        let formatted = "";
        let raw: unknown = "";
        let formula: string | undefined;
        let type = "empty";

        if (cell) {
          raw = cell.v;
          type = cell.t || "s";
          if (cell.f) formula = `=${cell.f}`;

          if (cell.w !== undefined) {
            formatted = cell.w;
          } else if (cell.v !== undefined) {
            if (cell.v instanceof Date) {
              formatted = cell.v.toLocaleDateString();
            } else {
              formatted = String(cell.v);
            }
          }
        }

        cells.push({
          row: r + 1,
          col: c,
          coord,
          formatted,
          raw,
          formula,
          type,
        });
      }
      rows.push({ rowNum: r + 1, cells });
    }

    return {
      rows,
      colHeaders,
      totalRows: range.e.r - range.s.r + 1,
      totalCols: range.e.c - range.s.c + 1,
      isEmpty: rows.length === 0,
    };
  }, [workbook, activeSheetName]);

  // Default cell selection to A1 on sheet change
  React.useEffect(() => {
    if (sheetData && sheetData.rows.length > 0 && sheetData.rows[0].cells.length > 0) {
      setSelectedCell(sheetData.rows[0].cells[0]);
    } else {
      setSelectedCell(null);
    }
  }, [sheetData]);

  // Zoom handlers
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 10, 150));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 10, 70));
  const handleZoomReset = () => setZoom(100);

  // Search match helper
  const isMatch = (text: string) => {
    if (!searchQuery.trim()) return false;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  return (
    <div className={`flex flex-col h-full w-full bg-slate-50 overflow-hidden font-inter select-text ${className}`}>
      {/* ===== Toolbar ===== */}
      <div className="h-10 bg-white border-b border-slate-200 px-3.5 flex items-center justify-between shrink-0 shadow-2xs z-20">
        <div className="flex items-center gap-2 min-w-0">
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase font-inter bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shrink-0">
            <FileSpreadsheet className="h-3 w-3" />
            XLSX
          </span>
          <span className="text-xs font-medium text-slate-800 truncate max-w-[200px] sm:max-w-xs" title={filename}>
            {filename}
          </span>
          {sheetData && !sheetData.isEmpty && (
            <span className="hidden md:inline-flex text-[11px] text-slate-400 font-mono">
              ({sheetData.totalRows} rows × {sheetData.totalCols} cols)
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* In-sheet search */}
          <div className="relative hidden sm:flex items-center">
            <Search className="h-3 w-3 text-slate-400 absolute left-2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find in sheet..."
              className="h-7 w-32 md:w-40 pl-6 pr-2 rounded-lg border border-slate-200 bg-slate-50 text-[11px] text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1e4c77] focus:border-[#1e4c77] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-1.5 text-slate-400 hover:text-slate-600 text-xs px-1 cursor-pointer"
                title="Clear search"
              >
                ×
              </button>
            )}
          </div>

          {/* Zoom controls */}
          <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 p-0.5">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoom <= 70}
              className="h-6 w-6 rounded flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-white transition-colors disabled:opacity-40 cursor-pointer"
              title="Zoom out"
              aria-label="Zoom out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="text-[11px] font-medium text-slate-700 px-1.5 font-mono tabular-nums w-11 text-center select-none">
              {zoom}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoom >= 150}
              className="h-6 w-6 rounded flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-white transition-colors disabled:opacity-40 cursor-pointer"
              title="Zoom in"
              aria-label="Zoom in"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleZoomReset}
            className="h-7 px-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 flex items-center gap-1 text-[11px] font-medium transition-colors shadow-2xs cursor-pointer select-none"
            title="Reset Zoom to 100%"
          >
            <RotateCcw className="h-3 w-3" />
            <span className="hidden lg:inline">Reset</span>
          </button>

          {onDownload && (
            <button
              type="button"
              onClick={onDownload}
              className="h-7 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-[#1e4c77] flex items-center gap-1.5 text-xs font-medium transition-colors shadow-2xs cursor-pointer ml-1"
              title="Download original file"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Download</span>
            </button>
          )}
        </div>
      </div>

      {/* ===== Formula & Cell Value Bar (Excel / Google Sheets style) ===== */}
      <div className="h-8 bg-slate-50 border-b border-slate-200 px-3 flex items-center gap-2 text-xs shrink-0 z-10">
        {/* Cell Coordinate Box */}
        <div className="w-14 h-5.5 bg-white border border-slate-200 rounded px-1.5 flex items-center justify-center font-mono font-semibold text-[11px] text-slate-700 select-none shadow-2xs">
          {selectedCell ? selectedCell.coord : "—"}
        </div>

        <div className="h-4 w-px bg-slate-200" />

        {/* Function fx Icon */}
        <span className="text-slate-400 font-serif italic text-xs font-bold select-none">
          fx
        </span>

        {/* Formula / Cell Content Display */}
        <div className="flex-1 h-5.5 bg-white border border-slate-200 rounded px-2 flex items-center text-[11.5px] font-mono text-slate-800 overflow-x-auto whitespace-nowrap shadow-2xs">
          {selectedCell ? (
            selectedCell.formula ? (
              <span className="text-blue-700 font-medium">{selectedCell.formula}</span>
            ) : (
              <span>{selectedCell.formatted || (selectedCell.raw !== undefined ? String(selectedCell.raw) : "")}</span>
            )
          ) : (
            <span className="text-slate-400 italic text-[11px]">Select any cell to inspect value</span>
          )}
        </div>
      </div>

      {/* ===== Spreadsheet Grid Area ===== */}
      <div className="flex-1 overflow-auto relative bg-slate-100/70 select-none">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-2xs z-30 gap-3">
            <Loader2 className="h-7 w-7 text-emerald-600 animate-spin" />
            <p className="text-xs font-medium text-slate-600">Loading Spreadsheet Data...</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
            <AlertCircle className="h-10 w-10 text-rose-500 mb-3" />
            <h3 className="text-sm font-semibold text-slate-900">Failed to render Spreadsheet</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">{error}</p>
            {onDownload && (
              <button
                type="button"
                onClick={onDownload}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1e4c77] hover:bg-[#163c60] text-white text-xs font-medium transition-all shadow-xs cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                Download Original File
              </button>
            )}
          </div>
        )}

        {sheetData && !isLoading && !error && (
          sheetData.isEmpty ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 text-xs">
              <FileSpreadsheet className="h-8 w-8 mb-2 opacity-50" />
              <span>This sheet is empty.</span>
            </div>
          ) : (
            <div
              style={{
                fontSize: `${(zoom / 100) * 11.5}px`,
              }}
              className="inline-block min-w-full align-top bg-white"
            >
              <table className="border-collapse w-full border-spacing-0">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 sticky top-0 z-10 shadow-xs select-none">
                    {/* Corner Cell */}
                    <th className="sticky left-0 top-0 z-20 bg-slate-200 border-r border-b border-slate-300 w-10 min-w-10 text-center text-[10px] text-slate-500 font-mono font-normal">
                      #
                    </th>
                    {/* Column Headers (A, B, C...) */}
                    {sheetData.colHeaders.map((colHeader) => {
                      const isColSelected = selectedCell && colHeader === selectedCell.coord.replace(/[0-9]/g, "");
                      return (
                        <th
                          key={colHeader}
                          className={`border-r border-b border-slate-300 font-mono font-semibold text-[10.5px] px-2.5 py-1 text-center min-w-[90px] max-w-[260px] truncate transition-colors ${
                            isColSelected ? "bg-emerald-100/70 text-emerald-900 border-b-emerald-600" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {colHeader}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sheetData.rows.map((row) => {
                    const isRowSelected = selectedCell && selectedCell.row === row.rowNum;
                    return (
                      <tr key={row.rowNum} className="hover:bg-slate-50/60 group">
                        {/* Row Index Column (1, 2, 3...) */}
                        <td
                          className={`sticky left-0 z-10 border-r border-b border-slate-300 font-mono text-[10px] text-center px-1.5 py-1 select-none font-medium transition-colors ${
                            isRowSelected ? "bg-emerald-100/70 text-emerald-900 font-bold border-r-emerald-600" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200/80"
                          }`}
                        >
                          {row.rowNum}
                        </td>

                        {/* Cells */}
                        {row.cells.map((cell) => {
                          const isSelected = selectedCell?.coord === cell.coord;
                          const matchesSearch = isMatch(cell.formatted);
                          const isNumeric = cell.type === "n" || (!isNaN(Number(cell.raw)) && cell.raw !== "" && cell.raw !== null);

                          return (
                            <td
                              key={cell.coord}
                              onClick={() => setSelectedCell(cell)}
                              className={`border-r border-b border-slate-200 px-2 py-1 max-w-[280px] truncate cursor-cell transition-all font-inter ${
                                isNumeric ? "text-right font-mono tabular-nums" : "text-left"
                              } ${
                                isSelected
                                  ? "outline-2 outline-[#1e4c77] -outline-offset-1 bg-blue-50/40 font-medium z-1"
                                  : matchesSearch
                                  ? "bg-amber-100 text-amber-900 font-medium"
                                  : "text-slate-800"
                              }`}
                              title={`${cell.coord}: ${cell.formatted || cell.raw || ""}`}
                            >
                              {cell.formatted || (cell.raw !== undefined && cell.raw !== null ? String(cell.raw) : "")}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* ===== Bottom Sheet Tabs Bar (Authentic Excel Tabs) ===== */}
      {sheetNames.length > 0 && (
        <div className="h-8 bg-slate-100 border-t border-slate-300 px-2 flex items-center gap-1 shrink-0 overflow-x-auto z-10 select-none">
          <div className="flex items-center text-slate-500 text-[11px] font-semibold pr-2 border-r border-slate-300 mr-1 gap-1">
            <Layers className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sheets</span>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto py-0.5">
            {sheetNames.map((name) => {
              const isActive = name === activeSheetName;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setActiveSheetName(name)}
                  className={`px-3 py-1 rounded-t text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border-t border-x ${
                    isActive
                      ? "bg-white text-[#1e4c77] border-slate-300 font-semibold shadow-2xs border-b-transparent -mb-px"
                      : "bg-slate-200/70 hover:bg-slate-200 text-slate-600 border-transparent hover:text-slate-800"
                  }`}
                >
                  <FileSpreadsheet className={`h-3 w-3 ${isActive ? "text-[#1e4c77]" : "text-slate-400"}`} />
                  <span className="max-w-[140px] truncate">{name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
