"use client";

/**
 * Verity AI — Plain Conversational Compliance Chat Window.
 *
 * A clean, plain-text chat interface for the officer to interact with the AI
 * compliance assistant. No card-based layouts, no heavy widget chrome — just
 * a natural message thread like any other chat window.
 *
 * Features:
 * - Plain text message bubbles (AI left, officer right)
 * - Live backend chat via POST /review/documents/{id}/chat
 * - Intelligent local fallback when backend is unreachable
 * - Quick prompt chips for common compliance workflows
 * - One-click "Use in Decision Notes" to populate the determination panel
 * - Copy button on AI messages
 */

import * as React from "react";
import {
  CornerDownLeft,
  Copy,
  Check,
  RefreshCw,
  ArrowDownToLine,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VerityMark } from "@/components/ui/verity-logo";
import { apiFetch } from "@/lib/api-client";
import type { BackendAnalysis } from "@/lib/documents-api";
import type { AIAnalysis } from "@/types/compliance";

// ---------------------------------------------------------------------------
// Types & Props
// ---------------------------------------------------------------------------

export interface AiAssistPanelProps {
  documentId?: string;
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

interface ChatResponse {
  reply: string;
  suggested_decision_note?: string | null;
}

// ---------------------------------------------------------------------------
// Build initial review briefing as readable plain text
// ---------------------------------------------------------------------------
function buildInitialReviewMessage(
  summary?: string | null,
  flags?: { passage: string; rule_id: string | null; explanation: string; severity: string }[],
  precedents?: { document_id: string; decision: string; comment?: string | null; masked_text?: string; title?: string }[]
): string {
  let msg = "";

  if (summary) {
    msg += `Summary:\n${summary}\n\n`;
  }

  if (flags && flags.length > 0) {
    msg += `Compliance Flags (${flags.length}):\n`;
    flags.forEach((f, i) => {
      msg += `${i + 1}. [${f.severity.toUpperCase()}] ${f.rule_id ?? "Compliance Flag"}\n`;
      msg += `   "${f.passage}"\n`;
      msg += `   ${f.explanation}\n`;
      if (i < flags.length - 1) msg += "\n";
    });
    msg += "\n";
  } else if (summary) {
    msg += "No regulatory flags detected in this submission.\n\n";
  }

  if (precedents && precedents.length > 0) {
    msg += `Similar Precedents (${Math.min(precedents.length, 3)}):\n`;
    precedents.slice(0, 3).forEach((p, i) => {
      const title = p.title ?? p.document_id.slice(0, 8);
      msg += `${i + 1}. ${title} — ${p.decision.toUpperCase()}: ${p.comment || p.masked_text?.slice(0, 90) || "No comment."}\n`;
    });
    msg += "\n";
  }

  if (msg.trim()) {
    msg += "What would you like to know? I can draft revision notes, suggest compliant wording, or explain regulatory citations.";
    return msg.trim();
  }

  // Fallback when no analysis data is available
  return "I'm ready to help with your compliance review. You can ask me to:\n\n• Explain flagged issues and regulatory citations\n• Draft a revision note for the advisor\n• Suggest compliant alternative wording\n• Compare with historical precedents\n\nWhat would you like to do?";
}

// ---------------------------------------------------------------------------
// Intelligent local fallback for chat
// ---------------------------------------------------------------------------
function generateLocalFallback(query: string, flags: { passage: string; rule_id: string | null; explanation: string; severity: string }[]): { reply: string; decisionText?: string } {
  const q = query.toLowerCase();

  if (["revision", "draft", "note", "memo", "advisor"].some(k => q.includes(k))) {
    if (flags.length > 0) {
      const items = flags.slice(0, 3).map((f, i) =>
        `${i + 1}. ${f.rule_id ?? "Compliance Flag"}: ${f.explanation}`
      ).join("\n");
      return {
        reply: `Here is a revision memo for the advisor:\n\n"Before this document can be cleared for distribution, please address the following compliance items:\n\n${items}\n\nPlease update and resubmit through the portal."`,
        decisionText: `Revision requested: Address ${flags.length} compliance citation(s).`,
      };
    }
    return {
      reply: "No compliance issues were flagged. You can approve this document or add specific notes for the advisor.",
      decisionText: "Approved: Document meets regulatory compliance standards.",
    };
  }

  if (["wording", "compliant", "phrase", "substitute", "rewrite"].some(k => q.includes(k))) {
    return {
      reply: "Recommended compliant phrasing:\n\n\"The strategy seeks to generate attractive risk-adjusted returns across diversified markets. Target returns are subject to market conditions, interest rate fluctuations, and credit risk. Past performance does not guarantee future results.\"\n\nThis satisfies FINRA Rule 2210(d)(1) by balancing objectives with explicit risk disclosure.",
      decisionText: "Approved subject to updating phrasing with standard FINRA risk qualifiers.",
    };
  }

  if (["precedent", "history", "similar", "past"].some(k => q.includes(k))) {
    return {
      reply: "I can compare this document against historical precedents in the compliance repository. The precedent search uses document similarity to find how comparable submissions were decided.\n\nWould you like me to look at specific regulatory areas or overall document similarity?",
    };
  }

  if (["approve", "pass", "clear"].some(k => q.includes(k))) {
    if (flags.length > 0) {
      return {
        reply: `Under FINRA Rule 2210, communications cannot be unconditionally approved while promissory statements or missing disclosures remain.\n\nThis document has ${flags.length} active flag(s). You may approve conditionally — record that approval is contingent on the advisor making the required corrections before client distribution.`,
        decisionText: "Conditional approval: Advisor must resolve flagged items prior to distribution.",
      };
    }
    return {
      reply: "No compliance violations were detected. The document appears suitable for approval.",
      decisionText: "Approved: Document meets firm compliance standards.",
    };
  }

  return {
    reply: `Regarding "${query}":\n\nUnder FINRA Rule 2210 and the SEC Marketing Rule, all client-facing materials must present a fair and balanced view of risks and rewards. I can help you draft specific audit commentary, suggest compliant phrasing, or explain applicable regulations.\n\nWhat would you like me to focus on?`,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AiAssistPanel({
  documentId,
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
            rule_id: f.matched_rule?.text || f.matched_rule?.type || null,
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

  const msgCounter = React.useRef(1);

  const [messages, setMessages] = React.useState<ChatMessage[]>(() => [
    {
      id: "init-1",
      sender: "ai",
      content: buildInitialReviewMessage(summary, flags, precedents),
      timestamp: "Just now",
      decisionText:
        flags.length > 0
          ? `Revision requested: Address ${flags.length} compliance citation(s).`
          : "Approved: Document meets regulatory compliance standards.",
      suggestedActions: [
        { label: "Draft revision note", query: "Draft a revision note for the advisor" },
        { label: "Suggest compliant wording", query: "Suggest compliant wording" },
        { label: "Compare precedents", query: "Compare similar precedents" },
      ],
    },
  ]);
  const [inputVal, setInputVal] = React.useState("");
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const chatBottomRef = React.useRef<HTMLDivElement>(null);

  // Update initial message when analysis loads from backend
  React.useEffect(() => {
    if (analysis && analysis.status === "succeeded") {
      const freshContent = buildInitialReviewMessage(summary, flags, precedents);
      const decisionText =
        flags.length > 0
          ? `Revision requested: Address ${flags.length} compliance citation(s) including ${flags[0]?.rule_id ?? "applicable rules"}.`
          : "Approved: Document meets regulatory compliance standards.";

      setMessages((prev) => {
        const hasInit = prev.some((m) => m.id === "init-1");
        if (hasInit) {
          return prev.map((m) =>
            m.id === "init-1" ? { ...m, content: freshContent, decisionText } : m
          );
        }
        return [
          {
            id: "init-1",
            sender: "ai",
            content: freshContent,
            timestamp: "Just now",
            decisionText,
            suggestedActions: [
              { label: "Draft revision note", query: "Draft a revision note for the advisor" },
              { label: "Suggest compliant wording", query: "Suggest compliant wording" },
              { label: "Compare precedents", query: "Compare similar precedents" },
            ],
          },
          ...prev,
        ];
      });
    }
  }, [analysis, summary, flags, precedents]);

  // Latest AI message index for suggestion chips
  const lastAiIndex = React.useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender === "ai") return i;
    }
    return -1;
  }, [messages]);

  // Scroll to bottom
  React.useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  // Send message — tries backend, falls back to local
  const handleSendMessage = async (textToSend?: string) => {
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

    // Build chat history for backend
    const history = messages
      .filter((m) => m.id !== "init-1" || m.sender === "ai")
      .slice(-6)
      .map((m) => ({
        role: m.sender === "ai" ? "assistant" : "officer",
        content: m.content,
      }));

    let reply = "";
    let decisionText: string | undefined;
    let usedBackend = false;

    // Try backend chat endpoint
    if (documentId) {
      try {
        const chatResult = await apiFetch<ChatResponse>(
          `/review/documents/${documentId}/chat`,
          {
            method: "POST",
            body: { message: query, history },
          }
        );
        reply = chatResult.reply;
        decisionText = chatResult.suggested_decision_note ?? undefined;
        usedBackend = true;
      } catch {
        // Fall through to local fallback
      }
    }

    // Local fallback
    if (!usedBackend) {
      const fallback = generateLocalFallback(query, flags);
      reply = fallback.reply;
      decisionText = fallback.decisionText;
    }

    // Determine follow-up suggestions
    const suggestedActions: SuggestedAction[] = [];
    const qLower = query.toLowerCase();
    if (qLower.includes("revision") || qLower.includes("draft")) {
      suggestedActions.push(
        { label: "Suggest compliant wording", query: "Suggest compliant wording" },
        { label: "Compare precedents", query: "Compare similar precedents" },
      );
    } else if (qLower.includes("wording") || qLower.includes("compliant")) {
      suggestedActions.push(
        { label: "Draft revision note", query: "Draft a revision note for the advisor" },
        { label: "Compare precedents", query: "Compare similar precedents" },
      );
    } else if (qLower.includes("precedent") || qLower.includes("similar")) {
      suggestedActions.push(
        { label: "Draft revision note", query: "Draft a revision note for the advisor" },
        { label: "Suggest compliant wording", query: "Suggest compliant wording" },
      );
    } else {
      suggestedActions.push(
        { label: "Draft revision note", query: "Draft a revision note for the advisor" },
        { label: "Suggest compliant wording", query: "Suggest compliant wording" },
        { label: "Compare precedents", query: "Compare similar precedents" },
      );
    }

    const nextAiId = msgCounter.current++;
    const aiMsg: ChatMessage = {
      id: `ai-${nextAiId}`,
      sender: "ai",
      content: reply,
      timestamp: "Just now",
      decisionText,
      suggestedActions,
    };
    setMessages((prev) => [...prev, aiMsg]);
    setIsGenerating(false);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="h-full flex flex-col font-inter select-text">
      {/* ===== CHAT CONTAINER ===== */}
      <div className="gemini-agent-container flex-1 min-h-0 flex flex-col shadow-sm">
        <div className="gemini-agent-inner relative flex-1 flex flex-col">

          {/* ===== HEADER ===== */}
          <div className="relative px-4 py-2.5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-[#1e4c77]/10 flex items-center justify-center border border-[#1e4c77]/20 text-[#1e4c77]">
                <VerityMark size={14} className="text-[#1e4c77]" />
              </div>
              <h2 className="text-[12px] font-semibold text-slate-900 tracking-tight">
                Verity AI
              </h2>
              <span className="text-[10px] text-slate-400">Compliance Review</span>
            </div>

            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                disabled={isRetrying || isLoading}
                className="h-7 px-2.5 rounded-md text-[11px] font-medium text-[#1e4c77] hover:bg-[#1e4c77]/10 border border-[#1e4c77]/20 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40 shadow-2xs"
                title="Re-run compliance scan"
              >
                <RefreshCw className={cn("h-3 w-3", (isRetrying || isLoading) && "animate-spin")} />
                <span>Scan</span>
              </button>
            )}
          </div>

          {/* ===== MESSAGE STREAM ===== */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {/* Error/Failed State */}
            {(errorMessage || analysis?.status === "failed") && (
              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/80 text-xs space-y-2 mb-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900">AI analysis unavailable</p>
                    <p className="text-amber-700 text-[11px] mt-0.5">
                      You can still review and chat normally — the analysis is supplementary.
                    </p>
                    {analysis?.error_message && (
                      <p className="text-amber-600 text-[10px] mt-1 font-mono">{analysis.error_message}</p>
                    )}
                  </div>
                </div>
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    disabled={isRetrying}
                    className="px-3 py-1.5 rounded-lg bg-[#1e4c77] hover:bg-[#163c60] text-white text-[11px] font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={cn("h-3 w-3", isRetrying && "animate-spin")} />
                    <span>{isRetrying ? "Retrying..." : "Retry Analysis"}</span>
                  </button>
                )}
              </div>
            )}

            {/* Loading skeleton */}
            {isLoading && !errorMessage && analysis?.status !== "failed" && (
              <div className="flex items-center gap-2 py-3 text-[11px] text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#1e4c77]" />
                <span>Analyzing document...</span>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, index) => {
              const isAi = msg.sender === "ai";
              const isLatestAi = isAi && index === lastAiIndex && !isGenerating;

              return (
                <div
                  key={msg.id}
                  className={cn("flex flex-col", isAi ? "items-start" : "items-end")}
                >
                  {/* Message bubble */}
                  <div
                    className={cn(
                      "max-w-[92%] rounded-xl text-[12px] leading-relaxed p-3 whitespace-pre-line",
                      isAi
                        ? "bg-slate-50 border border-slate-200/80 text-slate-800"
                        : "bg-[#1e4c77] text-white"
                    )}
                  >
                    {msg.content}

                    {/* AI action bar */}
                    {isAi && (
                      <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2 text-[10px]">
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="flex items-center gap-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                        >
                          {copiedId === msg.id ? (
                            <Check className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                          <span>{copiedId === msg.id ? "Copied" : "Copy"}</span>
                        </button>

                        {msg.decisionText && onInsertComment && (
                          <button
                            type="button"
                            onClick={() => onInsertComment(msg.decisionText!)}
                            className="flex items-center gap-1 text-[#1e4c77] hover:text-[#163c60] font-medium bg-[#1e4c77]/5 hover:bg-[#1e4c77]/10 border border-[#1e4c77]/15 px-2 py-0.5 rounded transition-colors cursor-pointer"
                            title="Insert into decision notes"
                          >
                            <ArrowDownToLine className="h-3 w-3" />
                            <span>Use in Decision</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quick prompt chips — only on latest AI message */}
                  {isLatestAi && msg.suggestedActions && msg.suggestedActions.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2 px-0.5">
                      {msg.suggestedActions.map((action, aIdx) => (
                        <button
                          key={aIdx}
                          type="button"
                          onClick={() => handleSendMessage(action.query)}
                          className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-white hover:bg-[#1e4c77]/8 hover:text-[#1e4c77] border border-slate-200 text-slate-500 transition-all cursor-pointer"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Typing indicator */}
            {isGenerating && (
              <div className="flex items-center gap-2 py-2 px-3 text-[11px] text-slate-400 bg-slate-50 rounded-lg border border-slate-200/60 w-fit">
                <div className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#1e4c77] animate-bounce [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#1e4c77] animate-bounce [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#1e4c77] animate-bounce" />
                </div>
                <span>Thinking...</span>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* ===== INPUT BAR ===== */}
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
                placeholder="Ask about this document..."
                className="w-full pl-3 pr-8 py-2 rounded-lg text-[11px] bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white focus:border-[#1e4c77] focus:ring-1 focus:ring-[#1e4c77] text-slate-800 placeholder:text-slate-400 transition-all"
              />
              <button
                type="submit"
                disabled={!inputVal.trim() || isGenerating}
                className="absolute right-1.5 h-6 w-6 rounded-md bg-[#1e4c77] hover:bg-[#163c60] text-white disabled:opacity-20 flex items-center justify-center transition-colors cursor-pointer disabled:cursor-not-allowed"
                title="Send"
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
