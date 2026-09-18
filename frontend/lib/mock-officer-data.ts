/**
 * Mock data for the Officer Review Queue — used as a fallback when the
 * backend is offline (same pattern as the advisor's MOCK_DOCUMENTS).
 *
 * These represent submissions from MULTIPLE advisors across the firm,
 * matching the officer's global queue perspective.
 */

import type { ComplianceDocument, AIAnalysis } from "@/types/compliance";

export const MOCK_QUEUE_DOCUMENTS: ComplianceDocument[] = [
  {
    id: "DOC-2026-0891",
    title: "Q1 2026 Alpha Growth Fund Presentation.pdf",
    advisor_id: "adv-101",
    advisor_name: "Jonathan Vance",
    advisor_email: "j.vance@apexadvisory.com",
    status: "pending",
    file_reference: "s3://compliance-vault/docs/2026/DOC-2026-0891.pdf",
    type: "Presentation / Deck",
    uploaded_at: "2026-09-12T09:24:00Z",
    thread_id: "THR-0891",
    replaces_document_id: null,
    version: 1,
    file_size_mb: 3.4,
    flags_count: { high: 2, medium: 1, low: 0 },
    ai_summary:
      "Presentation contains promissory return claims on slide 4 and lacks standard FINRA risk disclosures for private market exposure.",
  },
  {
    id: "DOC-2026-0887",
    title: "Emerging Markets Quarterly Outlook.pdf",
    advisor_id: "adv-103",
    advisor_name: "Marcus Chen",
    advisor_email: "m.chen@apexadvisory.com",
    status: "pending",
    file_reference: "s3://compliance-vault/docs/2026/DOC-2026-0887.pdf",
    type: "Market Commentary",
    uploaded_at: "2026-09-12T14:08:00Z",
    thread_id: "THR-0887",
    replaces_document_id: null,
    version: 1,
    file_size_mb: 2.1,
    flags_count: { high: 1, medium: 2, low: 1 },
    ai_summary:
      "Commentary references specific projected returns for emerging market instruments without required risk factor disclosures under FINRA Rule 2210(d)(1).",
  },
  {
    id: "DOC-2026-0884",
    title: "Retirement Horizons Client Newsletter - March 2026.docx",
    advisor_id: "adv-102",
    advisor_name: "Elena Rostova",
    advisor_email: "e.rostova@apexadvisory.com",
    status: "pending",
    file_reference: "s3://compliance-vault/docs/2026/DOC-2026-0884.docx",
    type: "Client Letter",
    uploaded_at: "2026-09-11T14:12:00Z",
    thread_id: "THR-0884",
    replaces_document_id: null,
    version: 1,
    file_size_mb: 1.2,
    flags_count: { high: 0, medium: 1, low: 2 },
    ai_summary:
      "Newsletter lacks SEC Form CRS disclosure in footer. Contains absolute language regarding tax certainty that may mislead clients.",
  },
  {
    id: "DOC-2026-0879",
    title: "Fixed Income Strategy Overview Q3.xlsx",
    advisor_id: "adv-104",
    advisor_name: "Diana Whitfield",
    advisor_email: "d.whitfield@apexadvisory.com",
    status: "pending",
    file_reference: "s3://compliance-vault/docs/2026/DOC-2026-0879.xlsx",
    type: "Performance Factsheet",
    uploaded_at: "2026-09-11T10:45:00Z",
    thread_id: "THR-0879",
    replaces_document_id: null,
    version: 1,
    file_size_mb: 4.7,
    flags_count: { high: 0, medium: 0, low: 1 },
    ai_summary:
      "Performance data appears compliant. Minor formatting recommendation for standardized benchmark disclosure placement.",
  },
];

/**
 * Mock AI analysis for the review workspace — represents the full
 * analysis response for DOC-2026-0891 (the high-risk presentation).
 */
export const MOCK_AI_ANALYSIS: AIAnalysis = {
  summary:
    "This 24-slide presentation for the Alpha Growth Fund contains promotional material targeting retail investors. The AI pre-screening identified 3 compliance concerns requiring officer review, including promissory return language and missing risk disclosures.",
  status: "ready",
  analyzed_at: "2026-09-12T09:28:00Z",
  flags: [
    {
      passage:
        "Guaranteed 14% annual returns regardless of broader market volatility.",
      rule_id: "FINRA-2210-PROMISSORY",
      explanation:
        "Guarantees on market-linked securities violate FINRA Rule 2210(d)(1)(B), which prohibits predictions or projections of investment performance. The term 'guaranteed' combined with a specific percentage creates an impermissible promissory statement.",
      severity: "high",
    },
    {
      passage:
        "Our proprietary algorithm has consistently outperformed the S&P 500 by 300 basis points over the past decade.",
      rule_id: "FINRA-2210-PERFORMANCE",
      explanation:
        "Historical performance claims require standardized presentation with appropriate benchmarks, time periods, and the mandatory disclosure that past performance does not guarantee future results (SEC Rule 482). No such disclaimer accompanies this claim.",
      severity: "high",
    },
    {
      passage:
        "Investors can expect tax-free growth in perpetuity through our Cayman Islands structure.",
      rule_id: "SEC-DISCLOSURE-TAX",
      explanation:
        "Tax-related claims must include applicable disclaimers about individual tax circumstances and regulatory changes. The phrase 'in perpetuity' makes an absolute claim that cannot be substantiated and may mislead investors about tax obligations.",
      severity: "medium",
    },
  ],
};

/**
 * Mock precedents for the review workspace — represents similar
 * historical documents and their compliance outcomes.
 */
export const MOCK_PRECEDENTS = [
  {
    document_id: "DOC-2025-0421",
    title: "Alpha Growth Fund Q4 2025 Presentation",
    similarity_score: 0.92,
    decision: "needs_revision" as const,
    officer_comment:
      "Approved after advisor removed promissory return figures from slides 4-6 and added required SEC performance disclaimers.",
    decided_at: "2025-12-15T14:30:00Z",
  },
  {
    document_id: "DOC-2025-0388",
    title: "Global Equity Fund Marketing Deck",
    similarity_score: 0.87,
    decision: "approved" as const,
    officer_comment:
      "All required disclosures present. Performance claims appropriately hedged with standard disclaimers.",
    decided_at: "2025-11-22T10:45:00Z",
  },
  {
    document_id: "DOC-2025-0312",
    title: "High Yield Bond Strategy Overview",
    similarity_score: 0.81,
    decision: "rejected" as const,
    officer_comment:
      "Contains materially misleading yield projections. Requires complete rewrite of performance section before resubmission.",
    decided_at: "2025-10-08T16:20:00Z",
  },
];

/**
 * Completed reviews history for the officer's "My Reviews" workspace.
 * Keeps record of previous determinations, regulatory comments, and dates.
 */
export interface CompletedReviewItem {
  id: string;
  title: string;
  advisor_id: string;
  advisor_name: string;
  advisor_email: string;
  status: "approved" | "needs_revision" | "rejected";
  type: string;
  uploaded_at: string;
  reviewed_at: string;
  officer_name: string;
  officer_feedback: string;
  flags_count: { high: number; medium: number; low: number };
  file_size_mb: number;
}

export const MOCK_COMPLETED_REVIEWS: CompletedReviewItem[] = [
  {
    id: "DOC-2026-0872",
    title: "2026 Wealth Management Capabilities Brochure.pdf",
    advisor_id: "adv-101",
    advisor_name: "Jonathan Vance",
    advisor_email: "j.vance@apexadvisory.com",
    status: "approved",
    type: "Promotional Brochure",
    uploaded_at: "2026-09-09T11:30:00Z",
    reviewed_at: "2026-09-10T09:15:00Z",
    officer_name: "Sarah Jenkins",
    officer_feedback: "All mandatory FINRA 2210 disclosures verified. Approved for client dissemination.",
    flags_count: { high: 0, medium: 0, low: 0 },
    file_size_mb: 5.2,
  },
  {
    id: "DOC-2026-0868",
    title: "Social Media Campaign - September Launch.docx",
    advisor_id: "adv-105",
    advisor_name: "Robert Tanaka",
    advisor_email: "r.tanaka@apexadvisory.com",
    status: "needs_revision",
    type: "Social Media Post",
    uploaded_at: "2026-09-08T16:20:00Z",
    reviewed_at: "2026-09-09T14:00:00Z",
    officer_name: "Sarah Jenkins",
    officer_feedback: "Remove promissory return statements on post 3. Add link to full ADV Part 2A disclosure.",
    flags_count: { high: 1, medium: 1, low: 0 },
    file_size_mb: 0.8,
  },
  {
    id: "DOC-2026-0861",
    title: "Client Risk Assessment Methodology.pdf",
    advisor_id: "adv-103",
    advisor_name: "Marcus Chen",
    advisor_email: "m.chen@apexadvisory.com",
    status: "rejected",
    type: "Presentation / Deck",
    uploaded_at: "2026-09-06T08:50:00Z",
    reviewed_at: "2026-09-07T11:30:00Z",
    officer_name: "Sarah Jenkins",
    officer_feedback: "Proprietary internal risk scoring models cannot be distributed without prior institutional risk committee sign-off.",
    flags_count: { high: 3, medium: 1, low: 0 },
    file_size_mb: 6.1,
  },
  {
    id: "DOC-2026-0855",
    title: "Mid-Year Performance Summary Report.xlsx",
    advisor_id: "adv-102",
    advisor_name: "Elena Rostova",
    advisor_email: "e.rostova@apexadvisory.com",
    status: "approved",
    type: "Performance Factsheet",
    uploaded_at: "2026-09-05T13:15:00Z",
    reviewed_at: "2026-09-06T10:00:00Z",
    officer_name: "Sarah Jenkins",
    officer_feedback: "Revision addresses prior concerns. Benchmark footnotes conform with SEC Rule 482 standards.",
    flags_count: { high: 0, medium: 0, low: 0 },
    file_size_mb: 3.9,
  },
  {
    id: "DOC-2026-0849",
    title: "ESG Impact Investment Guide 2026.pdf",
    advisor_id: "adv-104",
    advisor_name: "Diana Whitfield",
    advisor_email: "d.whitfield@apexadvisory.com",
    status: "approved",
    type: "Client Letter",
    uploaded_at: "2026-09-03T10:10:00Z",
    reviewed_at: "2026-09-04T15:45:00Z",
    officer_name: "Sarah Jenkins",
    officer_feedback: "ESG criteria disclaimers are compliant and adhere to the latest SEC ESG disclosure framework.",
    flags_count: { high: 0, medium: 1, low: 0 },
    file_size_mb: 2.8,
  },
  {
    id: "DOC-2026-0842",
    title: "Private Equity Co-Investment Thesis.pdf",
    advisor_id: "adv-101",
    advisor_name: "Jonathan Vance",
    advisor_email: "j.vance@apexadvisory.com",
    status: "needs_revision",
    type: "Presentation / Deck",
    uploaded_at: "2026-09-01T09:00:00Z",
    reviewed_at: "2026-09-02T11:20:00Z",
    officer_name: "Sarah Jenkins",
    officer_feedback: "Accredited investor and qualified purchaser eligibility definitions must be explicitly outlined in slide 2 footnotes.",
    flags_count: { high: 1, medium: 2, low: 0 },
    file_size_mb: 4.5,
  },
  {
    id: "DOC-2026-0838",
    title: "High Net Worth Estate Tax Planning Brief.docx",
    advisor_id: "adv-106",
    advisor_name: "Gregory Bell",
    advisor_email: "g.bell@apexadvisory.com",
    status: "approved",
    type: "Client Letter",
    uploaded_at: "2026-08-28T14:35:00Z",
    reviewed_at: "2026-08-29T09:40:00Z",
    officer_name: "Sarah Jenkins",
    officer_feedback: "Mandatory tax advice disclaimer ('Consult independent CPA') clearly placed. Approved.",
    flags_count: { high: 0, medium: 0, low: 1 },
    file_size_mb: 1.4,
  },
  {
    id: "DOC-2026-0829",
    title: "Digital Asset Advisory Allocation Matrix.pdf",
    advisor_id: "adv-105",
    advisor_name: "Robert Tanaka",
    advisor_email: "r.tanaka@apexadvisory.com",
    status: "rejected",
    type: "Market Commentary",
    uploaded_at: "2026-08-25T11:15:00Z",
    reviewed_at: "2026-08-26T16:00:00Z",
    officer_name: "Sarah Jenkins",
    officer_feedback: "Firm investment policy does not authorize direct crypto allocations in marketing material without custody disclosures.",
    flags_count: { high: 2, medium: 2, low: 0 },
    file_size_mb: 3.1,
  },
];
