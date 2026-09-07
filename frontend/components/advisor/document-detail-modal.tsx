"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ComplianceDocument } from "@/types/compliance";
import {
  FileText,
  Calendar,
  Layers,
  MessageSquare,
  Download,
  UploadCloud,
  CheckCircle2,
  Clock,
} from "lucide-react";

interface DocumentDetailModalProps {
  document: ComplianceDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onRevise: (doc: ComplianceDocument) => void;
}

export function DocumentDetailModal({
  document,
  isOpen,
  onClose,
  onRevise,
}: DocumentDetailModalProps) {
  if (!document) return null;

  const isRevisionNeeded = document.status === "needs_revision";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <span className="font-mono text-xs font-semibold text-slate-500">
              {document.id}
            </span>
            <StatusBadge status={document.status} />
          </div>
          <DialogTitle className="text-base text-slate-900 mt-1">
            {document.title}
          </DialogTitle>
          <DialogDescription>
            Thread: <span className="font-mono text-slate-600">{document.thread_id}</span> • Classification: {document.type}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* Metadata Grid */}
          <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-medium">
                Version
              </span>
              <span className="font-mono font-semibold text-slate-800">
                v{document.version}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-medium">
                File Size
              </span>
              <span className="font-medium text-slate-800">
                {document.file_size_mb} MB
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-medium">
                Submitted At
              </span>
              <span className="font-medium text-slate-800 tabular-nums">
                {new Date(document.uploaded_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Officer Feedback (Highlighted if Needs Revision or Rejected) */}
          {document.officer_feedback && (
            <div className="rounded-md border border-amber-200 bg-amber-50/80 p-3 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-amber-900 mb-1">
                <MessageSquare className="h-4 w-4 text-amber-700" />
                <span>Compliance Officer Remarks ({document.officer_name || "Compliance Team"}):</span>
              </div>
              <p className="leading-relaxed text-amber-950 pl-5">
                {document.officer_feedback}
              </p>
              {document.reviewed_at && (
                <p className="text-[10px] text-amber-700 mt-1 pl-5">
                  Reviewed on {new Date(document.reviewed_at).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* AI Assistance Summary */}
          {document.ai_summary && (
            <div className="rounded-md border border-slate-200 bg-slate-50/60 p-3 text-xs">
              <span className="font-semibold text-slate-800 block mb-1">
                AI Compliance Screening Summary:
              </span>
              <p className="text-slate-600 leading-relaxed">
                {document.ai_summary}
              </p>
            </div>
          )}

          {/* Revision History Link */}
          {document.replaces_document_id && (
            <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-100/70 p-2 rounded border border-slate-200">
              <Layers className="h-3.5 w-3.5 text-slate-500" />
              <span>
                This version supersedes prior submission{" "}
                <span className="font-mono font-semibold text-slate-800">
                  {document.replaces_document_id}
                </span>
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="outline"
            onClick={() => alert(`Downloading ${document.title}...`)}
          >
            <Download className="h-3.5 w-3.5 mr-1 text-slate-500" />
            Download Original
          </Button>
          {isRevisionNeeded && (
            <Button
              variant="warning"
              onClick={() => {
                onClose();
                onRevise(document);
              }}
            >
              <UploadCloud className="h-3.5 w-3.5 mr-1" />
              Submit Revision
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
