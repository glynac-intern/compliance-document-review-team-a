"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { DocumentViewer } from "@/components/officer/document-viewer";
import { AIAssistPanel } from "@/components/officer/ai-assist-panel";
import { DecisionPanel } from "@/components/officer/decision-panel";
import { MOCK_DOCUMENTS, MOCK_AI_ANALYSIS, MOCK_DOCUMENT_CONTENT } from "@/lib/mock-data";
import { AIFlag } from "@/types/compliance";

export default function ReviewPage() {
  const params = useParams();
  const docId = params.id as string;

  const doc = MOCK_DOCUMENTS.find((d) => d.id === docId) || MOCK_DOCUMENTS[0];
  const analysis = MOCK_AI_ANALYSIS[doc.id] || null;
  const content = MOCK_DOCUMENT_CONTENT[doc.id] || ["No document content available for preview."];

  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedFlagIndex, setSelectedFlagIndex] = React.useState<number | null>(null);
  const [highlightedPassage, setHighlightedPassage] = React.useState<string | null>(null);

  const handleSelectFlag = (flag: AIFlag) => {
    const idx = analysis?.flags.indexOf(flag) ?? null;
    setSelectedFlagIndex(idx);
    setHighlightedPassage(flag.passage);
  };

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    setTimeout(() => {
      setIsLoading(false);
      // Simulate success on retry
    }, 1500);
  };

  const handleSubmitDecision = (decision: {
    decision: "approved" | "rejected" | "revision_requested";
    comments: string;
    flagDispositions: { passage: string; confirmed: boolean }[];
  }) => {
    alert(`Decision submitted: ${decision.decision}\nComments: ${decision.comments}\nFlags confirmed: ${decision.flagDispositions.filter(f => f.confirmed).length}/${decision.flagDispositions.length}`);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Review header bar */}
      <div className="flex items-center justify-between h-11 border-b border-slate-200 bg-white px-4 shrink-0">
        <div className="flex items-center gap-3 text-[12px] min-w-0">
          <Link href="/officer" className="flex items-center gap-1 text-slate-500 hover:text-slate-700 shrink-0">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Queue</span>
          </Link>
          <span className="text-slate-300">|</span>
          <span className="font-mono text-slate-500 shrink-0">{doc.id}</span>
          <span className="text-slate-300">·</span>
          <span className="font-medium text-slate-900 truncate">{doc.title}</span>
          <span className="text-slate-300">·</span>
          <span className="text-slate-500 shrink-0">{doc.advisor_name}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusPill status={doc.status} />
          <span className="text-[11px] text-slate-400 font-mono">v{doc.version}</span>
        </div>
      </div>

      {/* Three-column workspace */}
      <div className="flex flex-1 min-h-0">
        {/* Left: Document Viewer (35%) */}
        <div className="w-[35%] border-r border-slate-200 bg-white flex flex-col min-h-0">
          <DocumentViewer content={content} highlightedPassage={highlightedPassage} />
        </div>

        {/* Center: AI Assist (35%) */}
        <div className="w-[35%] border-r border-slate-200 bg-white flex flex-col min-h-0">
          <AIAssistPanel
            analysis={analysis}
            isLoading={isLoading}
            error={error}
            onRetry={handleRetry}
            onSelectFlag={handleSelectFlag}
            selectedFlagIndex={selectedFlagIndex}
          />
        </div>

        {/* Right: Decision (30%) */}
        <div className="w-[30%] bg-white flex flex-col min-h-0">
          <DecisionPanel
            flags={analysis?.flags || []}
            onSubmitDecision={handleSubmitDecision}
          />
        </div>
      </div>
    </div>
  );
}
