"use client";

import * as React from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import { ComplianceDocument } from "@/types/compliance";

interface ReviewQueueTableProps {
  documents: ComplianceDocument[];
}

function PriorityDot({ level }: { level: "high" | "medium" | "low" }) {
  const color = level === "high" ? "bg-rose-500" : level === "medium" ? "bg-amber-500" : "bg-slate-400";
  return <span className={cn("inline-block h-2 w-2 rounded-full", color)} title={level} />;
}

function AIFlagChip({ counts }: { counts?: { high: number; medium: number; low: number } }) {
  if (!counts || (counts.high === 0 && counts.medium === 0 && counts.low === 0)) {
    return <span className="text-[11px] text-slate-400">—</span>;
  }
  const parts: string[] = [];
  if (counts.high > 0) parts.push(`${counts.high}H`);
  if (counts.medium > 0) parts.push(`${counts.medium}M`);
  if (counts.low > 0) parts.push(`${counts.low}L`);
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-slate-600">
      {parts.join(" ")}
    </span>
  );
}

export function ReviewQueueTable({ documents }: ReviewQueueTableProps) {
  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
      ", " +
      d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  const getPriority = (doc: ComplianceDocument): "high" | "medium" | "low" => {
    const h = doc.flags_count?.high ?? 0;
    const m = doc.flags_count?.medium ?? 0;
    if (h > 0) return "high";
    if (m > 0) return "medium";
    return "low";
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-6"><input type="checkbox" className="h-3 w-3 rounded border-slate-300" disabled /></TableHead>
          <TableHead className="w-8">Pri</TableHead>
          <TableHead className="w-24">Ref</TableHead>
          <TableHead>Document</TableHead>
          <TableHead className="w-28">Advisor</TableHead>
          <TableHead className="w-32">Submitted</TableHead>
          <TableHead className="w-16">AI Flags</TableHead>
          <TableHead className="w-24">Status</TableHead>
          <TableHead className="w-20 text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.length === 0 ? (
          <TableRow>
            <TableCell colSpan={9} className="h-24 text-center text-slate-400">
              No documents pending review.
            </TableCell>
          </TableRow>
        ) : (
          documents.map((doc) => (
            <TableRow key={doc.id} className="group">
              <TableCell><input type="checkbox" className="h-3 w-3 rounded border-slate-300" /></TableCell>
              <TableCell><PriorityDot level={getPriority(doc)} /></TableCell>
              <TableCell className="font-mono text-[11px] text-slate-500">{doc.id.replace("DOC-2026-", "")}</TableCell>
              <TableCell>
                <span className="text-slate-900 font-medium truncate max-w-[280px] block text-xs">{doc.title}</span>
              </TableCell>
              <TableCell className="text-slate-500 text-[11px]">{doc.advisor_name.split(" ").map(n => n[0]).join(". ")}.</TableCell>
              <TableCell className="text-slate-500 tabular-nums text-[11px]">{fmt(doc.uploaded_at)}</TableCell>
              <TableCell><AIFlagChip counts={doc.flags_count} /></TableCell>
              <TableCell><StatusPill status={doc.status} /></TableCell>
              <TableCell className="text-right">
                <Link href={`/officer/review/${doc.id}`}>
                  <Button size="xs" variant="outline" className="gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    Review
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
