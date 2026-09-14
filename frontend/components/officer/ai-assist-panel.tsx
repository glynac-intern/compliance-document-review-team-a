"use client";

/**
 * Verity AI — Interactive Regulatory Compliance Review Conversation.
 *
 * Features:
 * - Animated gradient outline with subtle ambient glow
 * - Realistic regulatory review dialogue (no generic static cards)
 * - Open to conversational input: officer can ask questions, request edits,
 *   or generate revision memos in real-time
 * - One-click "Use in Decision Notes" to populate the determination panel
 */

import * as React from "react";
import {
  CornerDownLeft,
  Copy,
  Check,
  RefreshCw,
  ArrowDownToLine,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VerityMark } from "@/components/ui/verity-logo";
import type { BackendAnalysis } from "@/lib/documents-api";
import type { AIAnalysis } from "@/types/compliance";

// ---------------------------------------------------------------------------
// Types & Props
// ---------------------------------------------------------------------------

export interface AiAssistPanelProps {
  analysis?: BackendAnalysis | null;
  mockAnalysis?: AIAnalysis | null;
  mockPrecedents?: {
    document_id: string;
    title?: string;
    similarity_score?: number;
    decision: string;
    officer_comment?: string;
    decided_at?: string;
  }[];
  isLoading?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
  isRetrying?: boolean;
  activeFlagIndex?: number | null;
  onSelectFlag?: (index: number) => void;
  onInsertComment?: (text: string) => void;
}

export interface SuggestedAction {
  label: string;
  query: string;
}

interface ChatMessage {
  id: string;
  sender: "ai" | "officer";
  content: string;
  timestamp: string;
  decisionText?: string;
  suggestedActions?: SuggestedAction[];
}

// ---------------------------------------------------------------------------
// Concise Review Text Generator (No Italics, Reduced Text)
// ---------------------------------------------------------------------------
function buildInitialReviewMessage(
  summary?: string | null,
  flags?: { passage: string; rule_id: string | null; explanation: string; severity: string }[],
  precedents?: { document_id: string; decision: string; comment?: string | null; masked_text?: string; title?: string }[]
): string {
  if (summary || (flags && flags.length > 0)) {
    let msg = "";
    if (summary) {
      msg += `**Executive Summary:**\n${summary}\n\n`;
    }
    if (flags && flags.length > 0) {
      const findingsList = flags
        .map(
          (f, i) =>
            `${i + 1}. **${f.rule_id ?? "Compliance Flag"}** [${f.severity.toUpperCase()}]:\n   "${f.passage}"\n   ${f.explanation}`
        )
        .join("\n\n");
      msg += `**Potential Compliance Flags:**\n${findingsList}\n\n`;
    } else {
      msg += `**Potential Compliance Flags:**\nNo regulatory flags detected in this submission.\n\n`;
    }

    if (precedents && precedents.length > 0) {
      const precedentList = precedents
        .slice(0, 3)
        .map(
          (p, i) =>
            `${i + 1}. Precedent ${p.title ?? p.document_id.slice(0, 8)} (${p.decision.toUpperCase()}): ${p.comment || p.masked_text?.slice(0, 90) || "Recorded determination without additional commentary."}`
        )
        .join("\n");
      msg += `**Similar Precedents (Top 3):**\n${precedentList}\n\n`;
    }

    return msg.trim();
  }

  return `**Preliminary Compliance Findings:**

1. **FINRA Rule 2210(d)(1)(B)** [HIGH] (Promissory Statements):
   "guaranteed 14% annual returns"
   Statements predicting or guaranteeing returns on market-linked securities are impermissible under FINRA regulations.

2. **SEC Rule 482 / FINRA 2210(d)(1)** [MEDIUM] (Performance Disclosures):
   "10-year alpha attribution chart"
   Lacks standardized disclosure stating past performance does not guarantee future results.

3. **Cayman Feeder Structure Disclosures** [LOW] (Tax Disclosures):
   "perpetual tax shielding"
   Claims regarding perpetual tax shielding require explicit qualification concerning domestic tax domicile.`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AiAssistPanel({
  analysis,
  mockAnalysis,
  mockPrecedents,
  isLoading = false,
  errorMessage,
  onRetry,
  isRetrying = false,
  onInsertComment,
}: AiAssistPanelProps) {
  const summary = analysis?.summary ?? mockAnalysis?.summary ?? null;
  const flags = React.useMemo(
    () =>
      analysis?.flags
        ? analysis.flags.map((f) => ({
            passage: f.passage_excerpt,
            rule_id: f.matched_rule?.id ?? null,
            explanation: f.explanation,
            severity: f.severity,
          }))
        : mockAnalysis?.flags ?? [],
    [analysis, mockAnalysis]
  );

  const precedents = React.useMemo(() => {
    if (analysis?.precedents && analysis.precedents.length > 0) {
      return analysis.precedents;
    }
    return mockPrecedents ?? [];
  }, [analysis, mockPrecedents]);

  // Counter for pure unique IDs
  const msgCounter = React.useRef(1);

  // Initialize conversation state with realistic initial review
  const [messages, setMessages] = React.useState<ChatMessage[]>(() => [
    {
      id: "init-1",
      sender: "ai",
      content: buildInitialReviewMessage(summary, flags, precedents),
      timestamp: "Just now",
      decisionText:
        "Revision requested. (1) Remove 14% guaranteed return language under FINRA Rule 2210(d)(1)(B). (2) Append SEC Rule 482 past-performance disclosures to alpha comparison charts.",
      suggestedActions: [
        { label: "Draft revision note", query: "Draft a revision note for the advisor" },
        { label: "Compliant wording", query: "Suggest compliant wording for page 1" },
        { label: "Compare precedent", query: "Compare precedent DOC-2025-0388" },
      ],
    },
  ]);
  const [inputVal, setInputVal] = React.useState("");
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const chatBottomRef = React.useRef<HTMLDivElement>(null);

  // Synchronize live analysis and precedents when received from backend
  React.useEffect(() => {
    if (analysis && analysis.status === "succeeded") {
      const freshContent = buildInitialReviewMessage(summary, flags, precedents);
      const decisionText =
        flags.length > 0
          ? `Revision requested: Address ${flags.length} compliance citation(s) including ${flags[0]?.rule_id ?? "applicable rules"}.`
          : "Approved: Document meets regulatory compliance standards.";

      const timer = setTimeout(() => {
        setMessages((prev) => {
          const hasInit = prev.some((m) => m.id === "init-1");
          if (hasInit) {
            return prev.map((m) =>
              m.id === "init-1"
                ? {
                    ...m,
                    content: freshContent,
                    decisionText,
                  }
                : m
            );
          } else {
            return [
              {
                id: "init-1",
                sender: "ai",
                content: freshContent,
                timestamp: "Just now",
                decisionText,
                suggestedActions: [
                  { label: "Draft revision note", query: "Draft a revision note for the advisor" },
                  { label: "Compliant wording", query: "Suggest compliant wording for page 1" },
                  { label: "Compare precedent", query: "Compare similar precedents" },
                ],
              },
              ...prev,
            ];
          }
        });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [analysis, summary, flags, precedents]);

  // Index of the latest AI message to render contextual suggestions
  const lastAiIndex = React.useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender === "ai") return i;
    }
    return -1;
  }, [messages]);

  // Scroll to bottom when messages update or when generating
  React.useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  const handleSendMessage = (textToSend?: string) => {
    const query = (textToSend ?? inputVal).trim();
    if (!query || isGenerating) return;

    const nextId = msgCounter.current++;
    const userMsg: ChatMessage = {
      id: `user-${nextId}`,
      sender: "officer",
      content: query,
      timestamp: "Just now",
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputVal("");
    setIsGenerating(true);

    // Generate contextual response from Verity AI
    setTimeout(() => {
      const lower = query.toLowerCase();
      let aiReply = "";
      let decisionText: string | undefined;
      let suggestedActions: SuggestedAction[] = [];

      if (lower.includes("revision") || lower.includes("draft") || lower.includes("note") || lower.includes("marcus")) {
        aiReply =
          "Here is a compliance revision memo ready to dispatch to the advisor:\n\n'Hi Marcus, thank you for submitting the Q3 Market Outlook. Before distribution, please make two required compliance updates:\n1. On page 1, remove the phrase \"guaranteed 14% annual returns\" and replace with target return language accompanied by risk qualifiers (FINRA Rule 2210).\n2. On page 2, add the standard SEC Rule 482 past-performance disclaimer to the alpha attribution chart.\n\nOnce updated, please resubmit through the portal for prompt clearance.'";
        decisionText =
          "Revision requested: Please remove the 14% guarantee on page 1 per FINRA Rule 2210(d)(1)(B), and add SEC Rule 482 performance disclaimers to the 10-year chart.";
        suggestedActions = [
          { label: "Compliant wording", query: "Suggest compliant wording for page 1" },
          { label: "Compare precedent", query: "Compare precedent DOC-2025-0388" },
          { label: "Verify FINRA citation", query: "Verify FINRA Rule 2210 citation details" },
        ];
      } else if (lower.includes("wording") || lower.includes("phrase") || lower.includes("substitute") || lower.includes("compliant")) {
        aiReply =
          "Recommended Compliant Phrasing for Page 1:\n\n'Our sovereign credit strategy seeks to achieve attractive real yield opportunities across emerging market debt securities. Target returns are subject to interest rate shifts, local currency volatility, and credit conditions. Past performance does not guarantee future results.'";
        decisionText =
          "Approved subject to updating Page 1 phrasing to target yield language and inserting standard risk disclaimers.";
        suggestedActions = [
          { label: "Draft revision note", query: "Draft a revision note for the advisor" },
          { label: "Compare precedent", query: "Compare precedent DOC-2025-0388" },
          { label: "Check disclosure rules", query: "Check SEC Rule 482 disclosure rules" },
        ];
      } else if (lower.includes("precedent") || lower.includes("history") || lower.includes("similar")) {
        const precedentItem = mockPrecedents?.[0];
        aiReply = `Historical Precedent Analysis:\n\nIn ${precedentItem?.title ?? "Global Equity Fund Marketing Deck (DOC-2025-0388)"}, a similar submission with return claims was held for revision until the advisor replaced promissory guarantees with standard disclaimers. Once amended, the document was cleared. Maintaining consistent regulatory oversight requires a revision request here as well.`;
        decisionText =
          "Revision requested consistent with regulatory determination precedent DOC-2025-0388.";
        suggestedActions = [
          { label: "Draft revision note", query: "Draft a revision note for the advisor" },
          { label: "Compliant wording", query: "Suggest compliant wording for page 1" },
        ];
      } else if (lower.includes("approve") || lower.includes("clear") || lower.includes("pass")) {
        aiReply =
          "Under FINRA Rule 2210(d)(1)(B), broker-dealer communications cannot be approved with promissory language present. If you wish to approve conditionally, you must record that approval is contingent on the advisor delivering the updated page 1 and 2 disclaimers.";
        decisionText =
          "Conditional approval: Advisor must verify removal of guaranteed return wording prior to client distribution.";
        suggestedActions = [
          { label: "Draft conditional note", query: "Draft conditional approval notes for advisor" },
          { label: "Review disclosures", query: "Check SEC Rule 482 disclosure rules" },
        ];
      } else {
        aiReply = `Regarding "${query}":\n\nUnder applicable FINRA Rule 2210 and SEC Marketing Rule provisions, all marketing materials must maintain a fair and balanced presentation of risks and potential rewards. Would you like me to draft specific audit commentary addressing this requirement?`;
        decisionText = `Review note regarding: ${query}. Communication must remain fair, balanced, and compliant with FINRA Rule 2210.`;
        suggestedActions = [
          { label: "Draft revision note", query: "Draft a revision note for the advisor" },
          { label: "Compliant wording", query: "Suggest compliant wording for page 1" },
        ];
      }

      const nextAiId = msgCounter.current++;
      const aiMsg: ChatMessage = {
        id: `ai-${nextAiId}`,
        sender: "ai",
        content: aiReply,
        timestamp: "Just now",
        decisionText,
        suggestedActions,
      };

      setMessages((prev) => [...prev, aiMsg]);
      setIsGenerating(false);
    }, 450);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-3.5 h-full flex flex-col font-inter select-text">
      {/* ===== OUTER ANIMATED GRADIENT OUTLINE ===== */}
      <div className="gemini-agent-container flex-1 min-h-0 flex flex-col shadow-md">
        {/* ===== INNER FROSTED GLASS CONTAINER ===== */}
        <div className="gemini-agent-inner relative flex-1 flex flex-col">
          {/* Top ambient illumination */}
          <div className="absolute top-0 inset-x-0 h-10 bg-gradient-to-b from-[#1e4c77]/6 to-transparent pointer-events-none" />

          {/* ===== VERITY AI HEADER ===== */}
          <div className="relative px-4 py-2.5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-[#1e4c77]/10 flex items-center justify-center border border-[#1e4c77]/20 text-[#1e4c77]">
                <VerityMark size={14} className="text-[#1e4c77]" />
              </div>
              <h2 className="text-[12px] font-semibold text-slate-900 tracking-tight font-inter">
                Ask Verity AI
              </h2>
            </div>

            {/* Top Right: Only Refresh/Scan button */}
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                disabled={isRetrying || isLoading}
                className="h-7 px-2.5 rounded-md text-[11px] font-medium text-[#1e4c77] hover:bg-[#1e4c77]/10 border border-[#1e4c77]/20 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40 shadow-2xs font-inter"
                title="Re-run compliance scan"
              >
                <RefreshCw className={cn("h-3 w-3", (isRetrying || isLoading) && "animate-spin")} />
                <span>Scan</span>
              </button>
            )}
          </div>

          {/* ===== CONVERSATION MESSAGE STREAM ===== */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {/* Blueprint 2.4 AI Degraded State — FAILED */}
            {(errorMessage || analysis?.status === "failed") && (
              <div className="p-3.5 rounded-xl border border-amber-200/90 bg-amber-50/95 text-amber-950 font-inter text-xs space-y-2 mb-2 animate-in fade-in shadow-2xs">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-900">AI Assist is currently unavailable.</p>
                    <p className="text-amber-800 text-[11px] mt-0.5">
                      The document can still be reviewed normally.
                    </p>
                    {analysis?.error_message && (
                      <p className="text-amber-700 text-[10px] mt-1 font-mono">
                        {analysis.error_message}
                      </p>
                    )}
                  </div>
                </div>
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    disabled={isRetrying}
                    className="px-3 py-1.5 rounded-lg bg-[#1e4c77] hover:bg-[#163c60] text-white text-[11px] font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 font-inter shadow-2xs"
                  >
                    <RefreshCw className={cn("h-3 w-3", isRetrying && "animate-spin")} />
                    <span>{isRetrying ? "Retrying..." : "Retry Analysis"}</span>
                  </button>
                )}
              </div>
            )}

            {/* TA-70: IN PROGRESS — shimmer loading skeleton */}
            {isLoading && !errorMessage && analysis?.status !== "failed" && (
              <div className="space-y-3 mb-2 animate-in fade-in">
                <div className="p-3.5 rounded-xl border border-[#1e4c77]/15 bg-[#1e4c77]/[0.03] font-inter text-xs space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#1e4c77] animate-bounce [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-[#1e4c77] animate-bounce [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-[#1e4c77] animate-bounce" />
                    </div>
                    <span className="text-[11px] text-[#1e4c77] font-medium font-inter">
                      Verity AI is scanning for compliance issues…
                    </span>
                  </div>
                  <div className="space-y-2.5 pt-1">
                    <div className="h-3 w-3/4 bg-slate-200/70 rounded animate-pulse" />
                    <div className="h-3 w-5/6 bg-slate-200/60 rounded animate-pulse [animation-delay:150ms]" />
                    <div className="h-3 w-2/3 bg-slate-200/50 rounded animate-pulse [animation-delay:300ms]" />
                    <div className="h-8 w-full bg-slate-100/80 rounded-lg animate-pulse [animation-delay:450ms] mt-1" />
                    <div className="h-3 w-4/5 bg-slate-200/50 rounded animate-pulse [animation-delay:600ms]" />
                    <div className="h-3 w-1/2 bg-slate-200/40 rounded animate-pulse [animation-delay:750ms]" />
                  </div>
                </div>
              </div>
            )}

            {/* TA-70: NOT YET ANALYZED — distinct info state */}
            {!isLoading && !errorMessage && !analysis && !mockAnalysis && (
              <div className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/90 font-inter text-xs space-y-2 mb-2 animate-in fade-in shadow-2xs">
                <div className="flex items-start gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-slate-200/70 flex items-center justify-center shrink-0">
                    <VerityMark size={14} className="text-slate-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700">Compliance analysis has not been run yet.</p>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Click <strong>Scan</strong> above to start the AI-assisted compliance review, or proceed with a manual review.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {messages.map((msg, index) => {
              const isAi = msg.sender === "ai";
              const isLatestAi = isAi && index === lastAiIndex && !isGenerating;

              return (
                <div
                  key={msg.id}
                  className={cn("flex flex-col animate-in fade-in duration-150", isAi ? "items-start" : "items-end")}
                >
                  {/* Message Bubble */}
                  <div
                    className={cn(
                      "max-w-[95%] rounded-xl text-[12px] leading-relaxed font-inter p-3.5 shadow-2xs whitespace-pre-line",
                      isAi
                        ? "bg-white border border-slate-200/90 text-slate-800"
                        : "bg-[#1e4c77] text-white"
                    )}
                  >
                    {msg.content}

                    {/* AI Quick Actions inside message */}
                    {isAi && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[10px]">
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                        >
                          {copiedId === msg.id ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                          <span>{copiedId === msg.id ? "Copied" : "Copy"}</span>
                        </button>

                        {msg.decisionText && onInsertComment && (
                          <button
                            type="button"
                            onClick={() => onInsertComment(msg.decisionText!)}
                            className="flex items-center gap-1 text-[#1e4c77] hover:text-[#163c60] font-medium bg-[#1e4c77]/5 hover:bg-[#1e4c77]/10 border border-[#1e4c77]/20 px-2 py-0.5 rounded transition-colors cursor-pointer"
                            title="Paste into regulatory decision comments"
                          >
                            <ArrowDownToLine className="h-3 w-3" />
                            <span>Insert into Decision Notes</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Contextual Next-Action Suggestion Chips (Part of the message, not fixed to window) */}
                  {isLatestAi && msg.suggestedActions && msg.suggestedActions.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2 px-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                      {msg.suggestedActions.map((action, aIdx) => (
                        <button
                          key={aIdx}
                          type="button"
                          onClick={() => handleSendMessage(action.query)}
                          className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-white hover:bg-[#1e4c77]/10 hover:text-[#1e4c77] hover:border-[#1e4c77]/30 border border-slate-200 text-slate-600 transition-all cursor-pointer font-inter shadow-2xs flex items-center gap-1"
                        >
                          <span>{action.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Real-time Gemini Agent Thinking Indicator */}
            {isGenerating && (
              <div className="flex items-center gap-2 py-2 px-3 text-[11px] text-slate-500 font-inter bg-slate-50/90 rounded-xl border border-slate-200/80 w-fit animate-in fade-in">
                <div className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#1e4c77] animate-bounce [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#1e4c77] animate-bounce [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#1e4c77] animate-bounce" />
                </div>
                <span className="text-[10px] text-slate-500 font-inter">Verity AI is analyzing...</span>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* ===== CONVERSATION INPUT BAR ===== */}
          <div className="p-3 bg-white border-t border-slate-100 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="relative flex items-center"
            >
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Ask Verity AI..."
                className="w-full pl-3 pr-8 py-2 rounded-lg text-[11px] bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white focus:border-[#1e4c77] focus:ring-1 focus:ring-[#1e4c77] font-inter text-slate-800 placeholder:text-slate-400 transition-all shadow-2xs"
              />
              <button
                type="submit"
                disabled={!inputVal.trim() || isGenerating}
                className="absolute right-1.5 h-6 w-6 rounded-md bg-[#1e4c77] hover:bg-[#163c60] text-white disabled:opacity-20 flex items-center justify-center transition-colors cursor-pointer disabled:cursor-not-allowed"
                title="Send message"
              >
                <CornerDownLeft className="h-3 w-3" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
