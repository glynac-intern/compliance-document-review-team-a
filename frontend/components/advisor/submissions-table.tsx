"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusPill } from "@/components/ui/status-pill";
import { MoreHorizontal } from "lucide-react";
import { ComplianceDocument } from "@/types/compliance";

interface SubmissionsTableProps {
  documents: ComplianceDocument[];
  onViewDetail: (doc: ComplianceDocument) => void;
  onRevise: (doc: ComplianceDocument) => void;
}

export function SubmissionsTable({ documents, onViewDetail, onRevise }: SubmissionsTableProps) {
  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
      ", " +
      d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  const [openMenu, setOpenMenu] = React.useState<string | null>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-6"><input type="checkbox" className="h-3 w-3 rounded border-slate-300" disabled /></TableHead>
          <TableHead className="w-24">Ref</TableHead>
          <TableHead>Name</TableHead>
          <TableHead className="w-24">Type</TableHead>
          <TableHead className="w-12">Ver</TableHead>
          <TableHead className="w-32">Submitted</TableHead>
          <TableHead className="w-24">Status</TableHead>
          <TableHead>Notes</TableHead>
          <TableHead className="w-8"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.length === 0 ? (
          <TableRow>
            <TableCell colSpan={9} className="h-24 text-center text-slate-400">
              No documents match filters.
            </TableCell>
          </TableRow>
        ) : (
          documents.map((doc) => (
            <TableRow key={doc.id} className="group">
              <TableCell><input type="checkbox" className="h-3 w-3 rounded border-slate-300" /></TableCell>
              <TableCell className="font-mono text-[11px] text-slate-500">{doc.id.replace("DOC-2026-", "")}</TableCell>
              <TableCell>
                <button onClick={() => onViewDetail(doc)} className="text-left text-slate-900 hover:text-blue-700 font-medium truncate max-w-[260px] block">
                  {doc.title}
                </button>
              </TableCell>
              <TableCell className="text-slate-500">{doc.type.split(" / ")[0].split(" ")[0]}</TableCell>
              <TableCell className="font-mono text-[11px] text-slate-500">v{doc.version}</TableCell>
              <TableCell className="text-slate-500 tabular-nums text-[11px]">{fmt(doc.uploaded_at)}</TableCell>
              <TableCell><StatusPill status={doc.status} /></TableCell>
              <TableCell className="text-[11px] text-slate-500 truncate max-w-[180px]">
                {doc.officer_feedback ? `"${doc.officer_feedback.slice(0, 50)}${doc.officer_feedback.length > 50 ? "..." : ""}"` : "—"}
              </TableCell>
              <TableCell>
                <div className="relative" ref={openMenu === doc.id ? menuRef : undefined}>
                  <button
                    onClick={() => setOpenMenu(openMenu === doc.id ? null : doc.id)}
                    className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {openMenu === doc.id && (
                    <div className="absolute right-0 top-full mt-1 z-40 w-36 rounded-md border border-slate-200 bg-white shadow-lg py-1 text-[12px]">
                      <button onClick={() => { onViewDetail(doc); setOpenMenu(null); }} className="block w-full text-left px-3 py-1.5 text-slate-700 hover:bg-slate-50">View details</button>
                      <button onClick={() => { alert("Download: " + doc.title); setOpenMenu(null); }} className="block w-full text-left px-3 py-1.5 text-slate-700 hover:bg-slate-50">Download</button>
                      {doc.status === "needs_revision" && (
                        <button onClick={() => { onRevise(doc); setOpenMenu(null); }} className="block w-full text-left px-3 py-1.5 text-amber-700 hover:bg-amber-50 font-medium">Submit revision</button>
                      )}
                    </div>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
