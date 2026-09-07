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
import { Input } from "@/components/ui/input";
import { UploadCloud, MessageSquare, AlertCircle, FileText, Check, X } from "lucide-react";
import { ComplianceDocument } from "@/types/compliance";

interface RevisionModalProps {
  document: ComplianceDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitRevision: (
    parentDoc: ComplianceDocument,
    revisionData: {
      title: string;
      fileSizeMb: number;
    }
  ) => void;
}

export function RevisionModal({
  document,
  isOpen,
  onClose,
  onSubmitRevision,
}: RevisionModalProps) {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [title, setTitle] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (document) {
      setTitle(`${document.title.replace(/\.pdf|\.docx|\.xlsx/gi, "")} (v${document.version + 1}).pdf`);
      setSelectedFile(null);
      setError(null);
    }
  }, [document]);

  if (!document) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        setError("File exceeds 10MB limit.");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError("Please select the amended document file.");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onSubmitRevision(document, {
        title: title.trim(),
        fileSizeMb: parseFloat((selectedFile.size / (1024 * 1024)).toFixed(2)),
      });
      onClose();
    }, 600);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Submit Document Revision</DialogTitle>
          <DialogDescription>
            Addressing feedback for <span className="font-mono text-slate-700">{document.id}</span> (Thread {document.thread_id})
          </DialogDescription>
        </DialogHeader>

        {/* Officer Feedback Box */}
        {document.officer_feedback && (
          <div className="rounded-md border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-950">
            <div className="flex items-center gap-1.5 font-semibold text-amber-900 mb-1">
              <MessageSquare className="h-3.5 w-3.5 text-amber-700" />
              <span>Officer Compliance Directives:</span>
            </div>
            <p className="leading-relaxed text-amber-900/90 pl-5">
              "{document.officer_feedback}"
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Upload Box */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 p-5 text-center cursor-pointer hover:border-slate-400 bg-slate-50/50"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.xlsx"
              className="hidden"
              onChange={handleFileChange}
            />

            {selectedFile ? (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-medium text-slate-900 truncate max-w-xs">
                      {selectedFile.name}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <>
                <UploadCloud className="h-6 w-6 text-slate-400 mb-1" />
                <p className="text-xs font-medium text-slate-700">
                  Select revised file (v{document.version + 1})
                </p>
                <p className="text-[10px] text-slate-400">PDF, DOCX, or XLSX</p>
              </>
            )}
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-700 block mb-1">
              Revision Title
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Retirement Horizons Newsletter (v2).docx"
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !selectedFile}>
              {isSubmitting ? "Submitting Revision..." : `Submit v${document.version + 1} Revision`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
