"use client";

import * as React from "react";
import {
  UploadCloud,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { ComplianceDocument, DocumentType } from "@/types/compliance";
import { FileTypeIcon } from "@/components/ui/file-type-icon";
import { cn } from "@/lib/utils";
import { documentsApi, type BackendDocument } from "@/lib/documents-api";
import { ApiError } from "@/lib/api-client";

interface NewSubmissionViewProps {
  onSubmit: (newDoc: BackendDocument | Partial<ComplianceDocument>) => void;
  onCancel: () => void;
}

const DOCUMENT_CATEGORIES: DocumentType[] = [
  "Presentation / Deck",
  "Market Commentary",
  "Client Letter",
  "Promotional Brochure",
  "Social Media Post",
  "Performance Factsheet",
  "Other",
];

const TARGET_AUDIENCES = [
  "Retail Clients",
  "Institutional Investors",
  "High-Net-Worth Individuals",
  "General Public",
  "Other",
];

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".xlsx"];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB per Software Blueprint v0.2

export function NewSubmissionView({
  onSubmit,
  onCancel,
}: NewSubmissionViewProps) {
  const [title, setTitle] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [customCategory, setCustomCategory] = React.useState("");
  const [audience, setAudience] = React.useState("");
  const [customAudience, setCustomAudience] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const validateAndSetFile = (candidate: File) => {
    setError(null);
    const extension = "." + candidate.name.split(".").pop()?.toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setError(
        `Invalid file type "${extension}". Blueprint policy permits PDF, DOCX, or XLSX files only.`
      );
      return;
    }

    if (candidate.size > MAX_FILE_SIZE_BYTES) {
      const sizeMb = (candidate.size / (1024 * 1024)).toFixed(1);
      setError(
        `File size (${sizeMb} MB) exceeds the 10 MB maximum limit specified in the compliance policy.`
      );
      return;
    }

    setFile(candidate);
    if (!title.trim()) {
      // Pre-fill clean title from file name (stripping extension)
      const cleanName = candidate.name.replace(/\.[^/.]+$/, "");
      setTitle(cleanName);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getFileFormatBadge = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toUpperCase() || "DOC";
    if (ext === "PDF") {
      return { label: "PDF", bg: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800" };
    }
    if (ext === "XLSX" || ext === "XLS") {
      return { label: "XLSX", bg: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" };
    }
    return { label: "DOCX", bg: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800" };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setError("Please select a document file (.pdf, .docx, or .xlsx) to submit.");
      return;
    }

    if (!title.trim()) {
      setError("Please provide a title for this compliance submission.");
      return;
    }

    if (!category) {
      setError("Please choose a category for this document.");
      return;
    }

    if (category === "Other" && !customCategory.trim()) {
      setError("Please enter a custom document category.");
      return;
    }

    if (!audience) {
      setError("Please choose a target audience.");
      return;
    }

    if (audience === "Other" && !customAudience.trim()) {
      setError("Please enter a custom target audience.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setUploadProgress(0);

    try {
      // TA-63: real upload to backend POST /documents with progress events
      const uploaded = await documentsApi.submit(file, setUploadProgress);
      onSubmit(uploaded);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCategoryValid = category === "Other" ? Boolean(customCategory.trim()) : Boolean(category);
  const isAudienceValid = audience === "Other" ? Boolean(customAudience.trim()) : Boolean(audience);
  const isFormValid = Boolean(file && title.trim() && isCategoryValid && isAudienceValid);

  return (
    <div className="max-w-4xl space-y-6 font-inter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-normal text-slate-800 dark:text-slate-100 tracking-tight font-inter">
            New Document Submission
          </h1>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="h-9 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-normal text-slate-600 dark:text-slate-300 transition-all cursor-pointer disabled:opacity-50 font-inter"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !isFormValid}
            className={cn(
              "h-9 px-4 rounded-xl bg-[#1e4c77] hover:bg-[#163e63] active:bg-[#112f4c] text-white text-xs font-normal transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-inter",
              isSubmitting && "opacity-80"
            )}
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
      </div>

      {/* Progress Bar (TA-63) */}
      {isSubmitting && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/30 p-4 space-y-1.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-xs font-inter text-slate-700 dark:text-slate-300">
            <span className="font-medium">Uploading document to Compliance Vault...</span>
            <span className="font-numbers">{uploadProgress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-blue-200/50 dark:bg-blue-900/50 overflow-hidden">
            <div
              className="h-full bg-[#1e4c77] transition-all duration-150 rounded-full"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Main Submission Form */}
      <div className="space-y-5">
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 p-3.5 text-xs text-rose-800 dark:text-rose-200 animate-in fade-in duration-150">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
            <div className="flex-1 font-inter">{error}</div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-rose-500 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Section 1: File Upload Zone */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-medium text-slate-800 dark:text-slate-100 font-inter">
                Document File <span className="text-rose-500 dark:text-rose-400">*</span>
              </h2>
            </div>
            {file && (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 font-inter font-normal">
                <CheckCircle2 className="h-3 w-3" />
                <span>File validated</span>
              </span>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.xlsx"
            onChange={handleFileInputChange}
            className="hidden"
            id="compliance-file-input"
          />

          {!file ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center",
                isDragging
                  ? "border-[#1e4c77] dark:border-[#7fb2e3] bg-[#ebf4fb]/50 dark:bg-[#1e4c77]/15"
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-[#f8fafc]/60 dark:bg-slate-800/60 hover:bg-[#f8fafc] dark:hover:bg-slate-800"
              )}
            >
              <div className="h-11 w-11 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[#1e4c77] dark:text-[#7fb2e3] mb-3 shadow-2xs">
                <UploadCloud className="h-5 w-5 stroke-[1.8]" />
              </div>
              <p className="text-xs font-medium text-slate-800 dark:text-slate-200 font-inter">
                Click to browse or drag and drop document here
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-inter mt-1">
                Supported formats: PDF, DOCX, XLSX · Maximum size: 10 MB
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-[#f8fafc] dark:bg-slate-800 p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <FileTypeIcon filename={file.name} size="md" />
                <div className="min-w-0 font-inter">
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                    {file.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                    <span className="font-numbers tabular-nums">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                    <span>·</span>
                    <span
                      className={cn(
                        "px-1.5 py-0.2 rounded border text-[10px] font-normal uppercase",
                        getFileFormatBadge(file.name).bg
                      )}
                    >
                      {getFileFormatBadge(file.name).label}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-[#1e4c77] dark:text-[#7fb2e3] hover:underline font-inter cursor-pointer px-2 py-1"
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  title="Remove file"
                  className="h-7 w-7 rounded-lg text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Document Metadata */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xs space-y-4">
          <h2 className="text-sm font-medium text-slate-800 dark:text-slate-100 font-inter">
            Document Metadata
          </h2>

          {/* Title */}
          <div>
            <label htmlFor="submission-title" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 font-inter">
              Document Title <span className="text-rose-500 dark:text-rose-400">*</span>
            </label>
            <input
              id="submission-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document title"
              className="w-full h-10 px-3.5 rounded-xl bg-[#f8fafc] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-normal font-inter text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-[#1e4c77] dark:focus:border-[#7fb2e3] focus:ring-2 focus:ring-[#1e4c77]/15 dark:focus:ring-[#7fb2e3]/20 transition-all"
            />
          </div>

          {/* Category & Audience */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="submission-category" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 font-inter">
                Document Category <span className="text-rose-500 dark:text-rose-400">*</span>
              </label>
              <div className="relative">
                <select
                  id="submission-category"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    if (e.target.value !== "Other") {
                      setCustomCategory("");
                    }
                  }}
                  className={cn(
                    "w-full h-10 px-3.5 rounded-xl bg-[#f8fafc] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-normal font-inter focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-[#1e4c77] dark:focus:border-[#7fb2e3] focus:ring-2 focus:ring-[#1e4c77]/15 dark:focus:ring-[#7fb2e3]/20 transition-all cursor-pointer appearance-none",
                    !category ? "text-slate-400 dark:text-slate-500" : "text-slate-800 dark:text-slate-200"
                  )}
                >
                  <option value="" disabled>
                    Choose Category
                  </option>
                  {DOCUMENT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} className="text-slate-800">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Category Input Field when "Other" is selected */}
              {category === "Other" && (
                <div className="mt-2.5 animate-in fade-in duration-150">
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Enter custom category"
                    className="w-full h-10 px-3.5 rounded-xl bg-[#f8fafc] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-normal font-inter text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-[#1e4c77] dark:focus:border-[#7fb2e3] focus:ring-2 focus:ring-[#1e4c77]/15 dark:focus:ring-[#7fb2e3]/20 transition-all"
                    autoFocus
                  />
                </div>
              )}
            </div>

            <div>
              <label htmlFor="submission-audience" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 font-inter">
                Target Audience <span className="text-rose-500 dark:text-rose-400">*</span>
              </label>
              <div className="relative">
                <select
                  id="submission-audience"
                  value={audience}
                  onChange={(e) => {
                    setAudience(e.target.value);
                    if (e.target.value !== "Other") {
                      setCustomAudience("");
                    }
                  }}
                  className={cn(
                    "w-full h-10 px-3.5 rounded-xl bg-[#f8fafc] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-normal font-inter focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-[#1e4c77] dark:focus:border-[#7fb2e3] focus:ring-2 focus:ring-[#1e4c77]/15 dark:focus:ring-[#7fb2e3]/20 transition-all cursor-pointer appearance-none",
                    !audience ? "text-slate-400 dark:text-slate-500" : "text-slate-800 dark:text-slate-200"
                  )}
                >
                  <option value="" disabled>
                    Choose Audience
                  </option>
                  {TARGET_AUDIENCES.map((aud) => (
                    <option key={aud} value={aud} className="text-slate-800">
                      {aud}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Audience Input Field when "Other" is selected */}
              {audience === "Other" && (
                <div className="mt-2.5 animate-in fade-in duration-150">
                  <input
                    type="text"
                    value={customAudience}
                    onChange={(e) => setCustomAudience(e.target.value)}
                    placeholder="Enter custom audience"
                    className="w-full h-10 px-3.5 rounded-xl bg-[#f8fafc] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-normal font-inter text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-[#1e4c77] dark:focus:border-[#7fb2e3] focus:ring-2 focus:ring-[#1e4c77]/15 dark:focus:ring-[#7fb2e3]/20 transition-all"
                    autoFocus
                  />
                </div>
              )}
            </div>
          </div>

          {/* Submission Notes */}
          <div>
            <label htmlFor="submission-notes" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 font-inter">
              Notes for Compliance Officer{" "}
              <span className="text-slate-400 dark:text-slate-500 font-normal">(Optional)</span>
            </label>
            <textarea
              id="submission-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="include details"
              className="w-full p-3 rounded-xl bg-[#f8fafc] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-normal font-inter text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-[#1e4c77] dark:focus:border-[#7fb2e3] focus:ring-2 focus:ring-[#1e4c77]/15 dark:focus:ring-[#7fb2e3]/20 transition-all resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
