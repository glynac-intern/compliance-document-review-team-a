"use client";

import * as React from "react";
import {
  X,
  UploadCloud,
  FileText,
  AlertTriangle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { ComplianceDocument } from "@/types/compliance";
import { documentsApi, validateFileBeforeUpload, type BackendDocument, type ThreadEntry } from "@/lib/documents-api";
import { ApiError } from "@/lib/api-client";

interface RevisionUploadModalProps {
  document: ComplianceDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitRevision: (uploaded: BackendDocument) => void;
}

export function RevisionUploadModal({
  document: doc,
  isOpen,
  onClose,
  onSubmitRevision,
}: RevisionUploadModalProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  // TA-65: the officer's comment, visible while preparing the revision
  // -- fetched fresh each time the modal opens, via the same real
  // thread endpoint TA-64 already wired into the inspector drawer.
  const [officerComment, setOfficerComment] = React.useState<string | null>(null);
  const [isLoadingComment, setIsLoadingComment] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen || !doc) {
      setOfficerComment(null);
      return;
    }
    setIsLoadingComment(true);
    documentsApi
      .getThread(doc.id)
      .then((thread: ThreadEntry[]) => {
        const entry = thread.find((t) => t.document_id === doc.id);
        setOfficerComment(entry?.review?.comment ?? null);
      })
      .catch(() => setOfficerComment(null))
      .finally(() => setIsLoadingComment(false));
  }, [isOpen, doc]);

  if (!isOpen || !doc) return null;

  const nextVersion = doc.version + 1;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const validationError = validateFileBeforeUpload(selected);
      if (validationError) {
        setError(validationError);
        setFile(null);
        return;
      }
      setFile(selected);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError("Please choose the amended PDF, DOCX, or XLSX file to upload.");
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);
    try {
      const uploaded = await documentsApi.submitRevision(doc.id, file, setUploadProgress);
      onSubmitRevision(uploaded);
      onClose();
    } catch (err) {
      // TA-65: surfaces the server's real rejection clearly -- e.g.
      // "This document has already been revised" if a revision was
      // already submitted (the server's guard, not re-implemented
      // client-side -- the server remains the authority on this).
      setError(err instanceof ApiError ? err.message : "Failed to submit revision. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 font-inter select-none animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-slate-200/90 overflow-hidden flex flex-col font-inter animate-in zoom-in-95 duration-150">
        {/* Minimal Header */}
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between font-inter">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-[#ebf4fb] border border-[#2575bc]/20 text-[#1e4c77] flex items-center justify-center shadow-2xs shrink-0">
              <UploadCloud className="h-4 w-4 stroke-[1.8]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[13px] font-medium text-slate-800 font-inter">
                  Revise & Resubmit Document
                </h3>
                <span className="rounded-full bg-[#ebf4fb] border border-[#2575bc]/20 px-2 py-0.5 text-[10px] font-medium text-[#1e4c77] font-numbers">
                  v{nextVersion}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-normal font-inter truncate max-w-[280px]">
                {doc.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="h-4 w-4 stroke-[1.8]" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 font-inter">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50/80 border border-rose-200/80 px-3 py-2 text-xs text-rose-700 font-inter">
              <AlertTriangle className="h-4 w-4 shrink-0 stroke-[1.8]" />
              <span>{error}</span>
            </div>
          )}

          {/* Real officer comment, while preparing the revision */}
          {isLoadingComment ? (
            <div className="rounded-xl bg-slate-50/70 border border-slate-200/70 p-3.5 text-xs text-slate-400 font-inter">
              Loading officer feedback...
            </div>
          ) : officerComment ? (
            <div className="rounded-xl bg-amber-50/60 border border-amber-200/70 p-3.5 font-inter">
              <p className="text-[10px] font-medium text-amber-800 uppercase tracking-wider mb-1 font-inter">
                Compliance Officer Request
              </p>
              <p className="text-xs text-amber-950 italic leading-relaxed font-normal font-inter">
                &ldquo;{officerComment}&rdquo;
              </p>
            </div>
          ) : null}

          {/* File Upload Zone */}
          <div>
            <label className="block text-xs font-normal text-slate-700 mb-1.5 font-inter">
              Upload Revised File (PDF, DOCX, XLSX)
            </label>
            <div
              className="border border-dashed border-slate-200 hover:border-[#1e4c77]/40 rounded-xl p-5 text-center bg-slate-50/50 hover:bg-[#ebf4fb]/20 transition-all cursor-pointer font-inter"
              onClick={() => window.document.getElementById("revision-file-upload")?.click()}
            >
              <input
                id="revision-file-upload"
                type="file"
                accept=".pdf,.docx,.xlsx"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="h-8 w-8 rounded-lg bg-[#ebf4fb] text-[#1e4c77] border border-[#2575bc]/15 flex items-center justify-center mx-auto mb-2 shadow-2xs">
                <UploadCloud className="h-4 w-4 stroke-[1.8]" />
              </div>
              {file ? (
                <div>
                  <p className="text-xs font-medium text-slate-800 font-inter">{file.name}</p>
                  <p className="text-[11px] text-slate-400 font-numbers mt-0.5">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB · Ready to upload
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-slate-600 font-normal font-inter">
                    Click to select amended file
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-inter font-normal">
                    Replaces current version with tracked revision history
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Upload progress */}
          {isSubmitting && (
            <div className="space-y-1 font-inter">
              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-[#1e4c77] transition-all duration-150"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 text-right font-numbers">{uploadProgress}%</p>
            </div>
          )}

          {/* Minimal Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 font-inter">
            <button
              type="button"
              onClick={onClose}
              className="h-8.5 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-normal text-slate-700 transition-all cursor-pointer shadow-2xs font-inter"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-8.5 px-3.5 rounded-lg bg-[#1e4c77] hover:bg-[#163e63] active:bg-[#112f4c] text-white text-xs font-normal transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 font-inter"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Uploading... {uploadProgress}%</span>
                </>
              ) : (
                <span>Submit Version {nextVersion}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
