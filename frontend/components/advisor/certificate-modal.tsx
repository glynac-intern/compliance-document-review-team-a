"use client";

import * as React from "react";
import {
  X,
  ShieldCheck,
  Download,
  FileCheck,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { ComplianceDocument } from "@/types/compliance";
import { VerityLogo } from "@/components/ui/verity-logo";

interface CertificateModalProps {
  document: ComplianceDocument | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CertificateModal({
  document: doc,
  isOpen,
  onClose,
}: CertificateModalProps) {
  if (!isOpen || !doc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 font-sans select-none animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Certificate Header Banner */}
        <div className="p-6 bg-linear-to-br from-[#1e4c77] via-[#22588b] to-[#184672] text-white flex flex-col items-center justify-center relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="h-12 w-12 rounded-full bg-white/15 border border-white/25 flex items-center justify-center mb-3 shadow-inner">
            <ShieldCheck className="h-6 w-6 text-emerald-300 stroke-[2.2]" />
          </div>

          <VerityLogo size={20} markClassName="text-white" wordmarkClassName="text-white text-[13px] tracking-[0.2em]" />
          <h3 className="text-base font-bold text-white mt-1">
            Compliance Clearance Certificate
          </h3>
          <p className="text-[11px] text-blue-100/80 font-roboto mt-0.5">
            FINRA Rule 2210 & SEC Rule 206(4)-1 Approved
          </p>
        </div>

        {/* Certificate Details */}
        <div className="p-6 space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 font-roboto">
            <div className="flex justify-between">
              <span className="text-slate-400">Document Name:</span>
              <span className="font-semibold text-slate-900 text-right truncate max-w-[200px]">
                {doc.title}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Certificate Hash ID:</span>
              <span className="font-mono text-slate-800 text-[11px]">
                CERT-{doc.id.replace("DOC-", "")}-OK
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Approved Date:</span>
              <span className="font-semibold text-slate-900">
                {doc.reviewed_at ? "March 02, 2026" : "Current Period"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Supervisory Officer:</span>
              <span className="font-semibold text-slate-900">
                {doc.officer_name || "Sarah Jenkins (Series 24)"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Version Approved:</span>
              <span className="font-semibold text-slate-900">v{doc.version} (Final)</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-emerald-50/70 border border-emerald-200/80 p-2.5 rounded-xl">
            <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
            <span>
              This certificate satisfies SEC Rule 17a-4 recordkeeping retention requirements.
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-slate-100 bg-[#f8fafc] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-10 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-600 transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              alert(`Compliance Certificate for ${doc.id} downloaded.`);
              onClose();
            }}
            className="flex-1 h-10 rounded-xl bg-[#1e4c77] hover:bg-[#163e63] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}
