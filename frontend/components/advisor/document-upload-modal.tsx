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
import { UploadCloud, FileText, Check, AlertCircle, X } from "lucide-react";
import { DocumentType } from "@/types/compliance";

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (newDoc: {
    title: string;
    type: DocumentType;
    fileSizeMb: number;
  }) => void;
}

const DOCUMENT_TYPES: DocumentType[] = [
  "Presentation / Deck",
  "Promotional Brochure",
  "Client Letter",
  "Market Commentary",
  "Social Media Post",
  "Performance Factsheet",
];

export function DocumentUploadModal({
  isOpen,
  onClose,
  onUploadSuccess,
}: DocumentUploadModalProps) {
  const [dragActive, setDragActive] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [documentType, setDocumentType] =
    React.useState<DocumentType>("Presentation / Deck");
  const [title, setTitle] = React.useState("");
  const [complianceCertified, setComplianceCertified] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const validateAndSetFile = (file: File) => {
    setError(null);
    const validExtensions = [".pdf", ".docx", ".xlsx"];
    const extension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

    if (!validExtensions.includes(extension)) {
      setError("Unsupported file format. Please upload PDF, DOCX, or XLSX.");
      return;
    }

    const maxSizeBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSizeBytes) {
      setError("File exceeds 10MB limit. Please compress or optimize the file.");
      return;
    }

    setSelectedFile(file);
    if (!title) {
      setTitle(file.name);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError("Please select a document to upload.");
      return;
    }
    if (!title.trim()) {
      setError("Please provide a document title.");
      return;
    }
    if (!complianceCertified) {
      setError("You must certify compliance before submitting.");
      return;
    }

    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      onUploadSuccess({
        title: title.trim(),
        type: documentType,
        fileSizeMb: parseFloat((selectedFile.size / (1024 * 1024)).toFixed(2)),
      });
      // Reset
      setSelectedFile(null);
      setTitle("");
      setComplianceCertified(false);
      setError(null);
      onClose();
    }, 600);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Submit Document for Compliance Review</DialogTitle>
          <DialogDescription>
            Upload client-facing communication materials. PDF, DOCX, or XLSX (max 10MB).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Drag and Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
              dragActive
                ? "border-slate-900 bg-slate-100"
                : selectedFile
                ? "border-emerald-300 bg-emerald-50/20"
                : "border-slate-200 hover:border-slate-400 bg-slate-50/50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.xlsx"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  validateAndSetFile(e.target.files[0]);
                }
              }}
            />

            {selectedFile ? (
              <div className="flex items-center gap-3 text-left w-full">
                <div className="h-10 w-10 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for review
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="h-10 w-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mb-2 border border-slate-200">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <p className="text-xs font-medium text-slate-800">
                  Click to browse or drag and drop document
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  PDF, DOCX, or XLSX up to 10MB
                </p>
              </>
            )}
          </div>

          {/* Document Title & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-slate-700 block mb-1">
                Document Title
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Q1 Alpha Fund Presentation"
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-700 block mb-1">
                Material Classification
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as DocumentType)}
                className="h-8 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-950 cursor-pointer"
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Compliance Certification */}
          <div className="rounded-md border border-slate-200 bg-slate-50/60 p-3">
            <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={complianceCertified}
                onChange={(e) => setComplianceCertified(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-950"
              />
              <span className="text-[11px] leading-relaxed text-slate-600">
                I certify that this material adheres to FINRA Rule 2210 and firm supervisory standards. It will not be distributed until written compliance approval is obtained.
              </span>
            </label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isUploading || !selectedFile || !complianceCertified}
            >
              {isUploading ? "Uploading & Storing..." : "Submit for Compliance Review"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
