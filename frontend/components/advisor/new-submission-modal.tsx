"use client";

import * as React from "react";
import {
  X,
  UploadCloud,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { DocumentType } from "@/types/compliance";
import { documentsApi, validateFileBeforeUpload, type BackendDocument } from "@/lib/documents-api";
import { ApiError } from "@/lib/api-client";

interface NewSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (uploaded: BackendDocument) => void;
}

export function NewSubmissionModal({
  isOpen,
  onClose,
  onSubmit,
}: NewSubmissionModalProps) {
  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState<DocumentType>("Presentation / Deck");
  const [audience, setAudience] = React.useState("Retail Clients");
  const [notes, setNotes] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const applySelectedFile = (selected: File) => {
    // TA-63: real client-side validation (file type + 10MB cap) --
    // fast feedback, but the server still enforces both authoritatively.
    const validationError = validateFileBeforeUpload(selected);
    if (validationError) {
      setError(validationError);
      setFile(null);
      return;
    }
    setFile(selected);
    setError(null);
    if (!title) {
      setTitle(selected.name);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      applySelectedFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      applySelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError("Please choose a PDF, DOCX, or XLSX file to upload.");
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);
    try {
      // TA-63: a REAL upload -- multipart POST /documents, with real
      // progress reported via XHR (fetch has no upload-progress event).
      const uploaded = await documentsApi.submit(file, setUploadProgress);
      onSubmit(uploaded);
      onClose();
    } catch (err) {
      // Real server-side errors (bad file signature, oversized file
      // slipping past the client check, etc.) shown with their actual
      // message -- the server remains the authority.
      setError(err instanceof ApiError ? err.message : "Upload failed. Please try again.");
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
            <h3 className="text-base font-bold text-slate-900">
              New Compliance Submission
            </h3>
            <p className="text-xs text-slate-500 font-roboto mt-0.5">
              Submit marketing materials or client communications for review
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Drag and Drop Zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-slate-200 hover:border-[#2575bc] rounded-2xl p-6 text-center bg-[#f8fafc] transition-colors cursor-pointer"
            onClick={() => document.getElementById("file-upload")?.click()}
          >
            <input
              id="file-upload"
              type="file"
              accept=".pdf,.docx,.xlsx"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="h-10 w-10 rounded-full bg-blue-50 text-[#1e4c77] flex items-center justify-center mx-auto mb-2">
              <UploadCloud className="h-5 w-5 stroke-[2.2]" />
            </div>
            {file ? (
              <div>
                <p className="text-xs font-semibold text-slate-900">{file.name}</p>
                <p className="text-[11px] text-slate-400 font-roboto mt-0.5">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB · Ready to scan
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-semibold text-slate-800">
                  Drop presentation, brochure, or client letter here
                </p>
                <p className="text-[11px] text-slate-400 font-roboto mt-0.5">
                  Supports PDF, DOCX, XLSX up to 10 MB
                </p>
              </div>
            )}
          </div>

          {/* Upload progress -- visible during the real upload */}
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

          {/* Document Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Document Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q3 High Yield Fund Strategy Deck"
              className="w-full h-10 px-3 rounded-xl bg-[#f4f6f8] border border-slate-200 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-[#2575bc] focus:ring-2 focus:ring-[#2575bc]/15 transition-all"
            />
          </div>

          {/* Document Type & Audience */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Document Category
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as DocumentType)}
                className="w-full h-10 px-3 rounded-xl bg-[#f4f6f8] border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-[#2575bc] transition-all"
              >
                <option value="Presentation / Deck">Presentation / Deck</option>
                <option value="Client Letter">Client Letter</option>
                <option value="Promotional Brochure">Promotional Brochure</option>
                <option value="Social Media Post">Social Media Post</option>
                <option value="Market Commentary">Market Commentary</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Audience
              </label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[#f4f6f8] border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-[#2575bc] transition-all"
              >
                <option value="Retail Clients">Retail Clients (SEC Strict)</option>
                <option value="Institutional">Institutional Investors</option>
                <option value="High Net Worth">High Net Worth (Accredited)</option>
              </select>
            </div>
          </div>

          {/* Advisor Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notes for Reviewing Officer (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Highlight any special exemptions, existing disclosures, or target distribution date..."
              rows={2}
              className="w-full p-2.5 rounded-xl bg-[#f4f6f8] border border-slate-200 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-[#2575bc] transition-all resize-none"
            />
          </div>

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
                <span>Submit for Review</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
