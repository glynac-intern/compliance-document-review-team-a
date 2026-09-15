"use client";

import * as React from "react";
import {
  X,
  UploadCloud,
  FileText,
  AlertTriangle,
  Loader2,
  Check,
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
  const [comment, setComment] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  // Officer's prior feedback for this document
  const [officerComment, setOfficerComment] = React.useState<string | null>(null);
  const [isLoadingComment, setIsLoadingComment] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen || !doc) {
      setOfficerComment(null);
      setFile(null);
      setComment("");
      setError(null);
      setUploadProgress(0);
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
      setError("Please select a file to upload.");
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);
    try {
      const uploaded = await documentsApi.submitRevision(
        doc.id,
        file,
        setUploadProgress,
        comment.trim() || undefined
      );
      onSubmitRevision(uploaded);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to submit revision.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 font-inter select-none animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden flex flex-col font-inter animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900">
                Submit Revision
              </h3>
              <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-semibold text-[#1e4c77]">
                v{nextVersion}
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate mt-0.5">
              {doc.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Officer Feedback from prior review */}
          {isLoadingComment ? (
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-400">
              Loading reviewer feedback...
            </div>
          ) : officerComment ? (
            <div className="rounded-lg bg-amber-50/70 border border-amber-200 p-3 text-xs">
              <p className="text-[10px] font-semibold text-amber-800 uppercase tracking-wider mb-1">
                Officer Feedback
              </p>
              <p className="text-amber-950 leading-relaxed italic">
                &ldquo;{officerComment}&rdquo;
              </p>
            </div>
          ) : null}

          {/* File Picker */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Revised File
            </label>
            <div
              onClick={() => window.document.getElementById("revision-file-upload")?.click()}
              className="border border-dashed border-slate-200 hover:border-[#1e4c77] rounded-xl p-4 text-center bg-slate-50/50 hover:bg-blue-50/20 transition-all cursor-pointer"
            >
              <input
                id="revision-file-upload"
                type="file"
                accept=".pdf,.docx,.xlsx"
                className="hidden"
                onChange={handleFileChange}
              />
              {file ? (
                <div className="flex items-center justify-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-blue-50 text-[#1e4c77] flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-xs font-medium text-slate-800 truncate max-w-[240px]">
                      {file.name}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB · Click to change
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-2">
                  <UploadCloud className="h-6 w-6 text-slate-400 mx-auto mb-1.5" />
                  <p className="text-xs text-slate-700 font-medium">
                    Choose file to upload
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    PDF, DOCX, or XLSX up to 10MB
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Revision Comments */}
          <div>
            <label htmlFor="revision-comments" className="block text-xs font-medium text-slate-700 mb-1.5">
              Revision Notes
            </label>
            <textarea
              id="revision-comments"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Explain the changes made in this version..."
              rows={3}
              maxLength={1000}
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1e4c77] focus:border-transparent transition-all resize-none"
            />
            <div className="flex justify-end mt-1">
              <span className="text-[10px] text-slate-400 tabular-nums">
                {comment.length}/1000
              </span>
            </div>
          </div>

          {/* Upload progress */}
          {isSubmitting && (
            <div className="space-y-1">
              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-[#1e4c77] transition-all duration-150"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 text-right tabular-nums">{uploadProgress}%</p>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-8.5 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs text-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !file}
              className="h-8.5 px-4 rounded-lg bg-[#1e4c77] hover:bg-[#163e63] active:bg-[#112f4c] text-white text-xs font-medium transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <span>Submit Revision</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
