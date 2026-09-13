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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 font-sans select-none animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-[#f8fafc]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                Revision v{nextVersion}
              </span>
              <span className="text-xs text-slate-500 font-roboto">{doc.id.slice(0, 8)}</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 leading-snug">
              Revise & Resubmit Document
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Real officer comment, while preparing the revision */}
          {isLoadingComment ? (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-xs text-slate-400">
              Loading officer feedback...
            </div>
          ) : officerComment ? (
            <div className="rounded-xl bg-amber-50/70 border border-amber-200/80 p-3.5">
              <p className="text-[11px] font-bold text-amber-900 uppercase font-roboto mb-1">
                Compliance Officer Request:
              </p>
              <p className="text-xs text-amber-950 italic leading-relaxed">
                &ldquo;{officerComment}&rdquo;
              </p>
            </div>
          ) : null}

          {/* File Upload Zone */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Upload Revised Document File (v{nextVersion})
            </label>
            <div
              className="border-2 border-dashed border-slate-200 hover:border-[#2575bc] rounded-2xl p-4 text-center bg-[#f8fafc] transition-colors cursor-pointer"
              onClick={() => window.document.getElementById("revision-file-upload")?.click()}
            >
              <input
                id="revision-file-upload"
                type="file"
                accept=".pdf,.docx,.xlsx"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="h-8 w-8 rounded-full bg-blue-50 text-[#1e4c77] flex items-center justify-center mx-auto mb-1.5">
                <UploadCloud className="h-4 w-4 stroke-[2.2]" />
              </div>
              {file ? (
                <div>
                  <p className="text-xs font-semibold text-slate-900">{file.name}</p>
                  <p className="text-[11px] text-slate-400 font-roboto">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB · Attached
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-600">
                  Click to select amended <span className="font-semibold">{doc.title}</span>
                </p>
              )}
            </div>
          </div>

          {/* Upload progress */}
          {isSubmitting && (
            <div className="space-y-1">
              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-[#2575bc] transition-all duration-150"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 text-right">{uploadProgress}%</p>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 h-10 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-600 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 h-10 rounded-xl bg-[#1e4c77] hover:bg-[#163e63] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
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
