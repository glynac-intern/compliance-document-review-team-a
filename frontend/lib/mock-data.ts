import {
  ComplianceDocument,
  AIAnalysis,
  AuditLogEntry,
} from "@/types/compliance";

export const MOCK_DOCUMENTS: ComplianceDocument[] = [
  {
    id: "DOC-2026-0891",
    title: "Q1 2026 Alpha Growth Fund Presentation.pdf",
    advisor_id: "adv-101",
    advisor_name: "Jonathan Vance",
    advisor_email: "j.vance@apexadvisory.com",
    status: "pending",
    file_reference: "s3://compliance-vault/docs/2026/DOC-2026-0891.pdf",
    type: "Presentation / Deck",
    uploaded_at: "2026-03-05T09:24:00Z",
    thread_id: "THR-0891",
    replaces_document_id: null,
    version: 1,
    file_size_mb: 3.4,
    flags_count: {
      high: 1,
      medium: 2,
      low: 0,
    },
    ai_summary:
      "Presentation contains promissory return claims on slide 4 and lacks standard FINRA risk disclosures for private market exposure.",
  },
  {
    id: "DOC-2026-0884",
    title: "Retirement Horizons Client Newsletter - March 2026.docx",
    advisor_id: "adv-102",
    advisor_name: "Elena Rostova",
    advisor_email: "e.rostova@apexadvisory.com",
    status: "needs_revision",
    file_reference: "s3://compliance-vault/docs/2026/DOC-2026-0884.docx",
    type: "Client Letter",
    uploaded_at: "2026-03-04T14:12:00Z",
    thread_id: "THR-0884",
    replaces_document_id: null,
    version: 1,
    file_size_mb: 1.2,
    officer_feedback:
      "Please insert the standard SEC Form CRS disclosure in the footer of page 2 and remove absolute language regarding tax certainty.",
    officer_name: "Sarah Jenkins",
    reviewed_at: "2026-03-04T17:30:00Z",
    flags_count: {
      high: 0,
      medium: 1,
      low: 1,
    },
    ai_summary:
      "Newsletter mentions guaranteed tax efficiency without clarifying individual state variances. Form CRS cross-reference is missing.",
  },
  {
    id: "DOC-2026-0879",
    title: "Fixed Income Yield Advantage Flyer.pdf",
    advisor_id: "adv-101",
    advisor_name: "Jonathan Vance",
    advisor_email: "j.vance@apexadvisory.com",
    status: "approved",
    file_reference: "s3://compliance-vault/docs/2026/DOC-2026-0879.pdf",
    type: "Promotional Brochure",
    uploaded_at: "2026-03-02T11:05:00Z",
    thread_id: "THR-0879",
    replaces_document_id: null,
    version: 1,
    file_size_mb: 2.1,
    officer_feedback:
      "Approved. All required 30-day SEC yield disclaimers are prominently displayed with appropriate font hierarchy.",
    officer_name: "Sarah Jenkins",
    reviewed_at: "2026-03-02T15:45:00Z",
    flags_count: {
      high: 0,
      medium: 0,
      low: 0,
    },
    ai_summary:
      "No compliance violations detected. Standard FINRA Rule 2210 disclosures are present and compliant.",
  },
  {
    id: "DOC-2026-0872",
    title: "Crypto Index Strategy Overview.pdf",
    advisor_id: "adv-105",
    advisor_name: "Marcus Sterling",
    advisor_email: "m.sterling@apexadvisory.com",
    status: "rejected",
    file_reference: "s3://compliance-vault/docs/2026/DOC-2026-0872.pdf",
    type: "Presentation / Deck",
    uploaded_at: "2026-03-01T16:30:00Z",
    thread_id: "THR-0872",
    replaces_document_id: null,
    version: 1,
    file_size_mb: 4.8,
    officer_feedback:
      "Firm policy prohibits distribution of non-approved digital asset investment strategies to non-accredited retail clients.",
    officer_name: "David Chen",
    reviewed_at: "2026-03-02T09:15:00Z",
    flags_count: {
      high: 3,
      medium: 1,
      low: 0,
    },
    ai_summary:
      "High regulatory risk: Unregistered digital asset promotion targeting retail investors without accredited investor gate.",
  },
  {
    id: "DOC-2026-0865",
    title: "LinkedIn Market Pulse - March Inflation Commentary.docx",
    advisor_id: "adv-104",
    advisor_name: "Claire Moreau",
    advisor_email: "c.moreau@apexadvisory.com",
    status: "pending",
    file_reference: "s3://compliance-vault/docs/2026/DOC-2026-0865.docx",
    type: "Social Media Post",
    uploaded_at: "2026-03-05T08:00:00Z",
    thread_id: "THR-0865",
    replaces_document_id: null,
    version: 1,
    file_size_mb: 0.4,
    flags_count: {
      high: 0,
      medium: 1,
      low: 0,
    },
    ai_summary:
      "Post references specific sector recommendations without linking to full ADV Part 2A brochure.",
  },
  {
    id: "DOC-2026-0858",
    title: "Retirement Horizons Client Newsletter - March 2026 (v2).docx",
    advisor_id: "adv-102",
    advisor_name: "Elena Rostova",
    advisor_email: "e.rostova@apexadvisory.com",
    status: "in_review",
    file_reference: "s3://compliance-vault/docs/2026/DOC-2026-0858.docx",
    type: "Client Letter",
    uploaded_at: "2026-03-05T10:15:00Z",
    thread_id: "THR-0884",
    replaces_document_id: "DOC-2026-0884",
    revision_notes: "Updated page 2 footer disclosures and replaced non-standard terminology as requested.",
    version: 2,
    file_size_mb: 1.3,
    flags_count: {
      high: 0,
      medium: 0,
      low: 1,
    },
    ai_summary:
      "Revised draft addresses page 2 footer disclosure. Minor low-severity formatting observation on fee footnote.",
  },
];

export const MOCK_AI_ANALYSIS: Record<string, AIAnalysis> = {
  "DOC-2026-0891": {
    summary:
      "The submitted presentation contains promissory performance statements on slide 4 that guarantee double-digit annualized returns without downside risk. Additionally, mandatory past performance disclaimers under FINRA Rule 2210 and SEC Rule 206(4)-1 are omitted from the executive distribution deck.",
    status: "ready",
    analyzed_at: "2026-03-05T09:25:12Z",
    flags: [
      {
        passage:
          "Our Alpha Growth Model delivers a guaranteed 12.5% annualized return with zero downside volatility in any macroeconomic regime.",
        rule_id: "FINRA Rule 2210(d)(1)(D)",
        explanation:
          "Communications may not make promissory statements or claims that past or projected returns are guaranteed. Zero downside claims violate basic anti-fraud standards.",
        severity: "high",
      },
      {
        passage:
          "Investors can expect steady tax-sheltered yield distributions beginning on day thirty without exception.",
        rule_id: "SEC Rule 206(4)-1(a)(5)",
        explanation:
          "Unqualified statements promising specific distribution schedules without disclosing potential distribution suspension clauses violate the SEC Marketing Rule.",
        severity: "medium",
      },
      {
        passage:
          "Past track record indicates consistent outperformance against the S&P 500 benchmark across all 5 trailing fiscal years.",
        rule_id: "FINRA Rule 2210(d)(1)(F)",
        explanation:
          "Performance comparisons must prominently state that past performance is no guarantee of future results and display net-of-fees performance metrics alongside gross numbers.",
        severity: "medium",
      },
    ],
  },
  "DOC-2026-0884": {
    summary:
      "The client newsletter contains general macroeconomic commentary with two minor compliance warnings regarding state-specific tax assertions and Form CRS disclosure placement.",
    status: "ready",
    analyzed_at: "2026-03-04T14:13:05Z",
    flags: [
      {
        passage:
          "Municipal bond allocations provide 100% tax-free income for every family in our advisory practice.",
        rule_id: "MSRB Rule G-21",
        explanation:
          "Income from municipal bonds may be subject to alternative minimum tax (AMT) and out-of-state taxation. Overbroad '100% tax-free' claim is misleading.",
        severity: "medium",
      },
      {
        passage:
          "For further information, reach out directly to your designated portfolio team.",
        rule_id: "SEC Form CRS Instruction",
        explanation:
          "Advisor marketing communications must reference or link to the firm's client relationship summary (Form CRS).",
        severity: "low",
      },
    ],
  },
};

export const MOCK_DOCUMENT_CONTENT: Record<string, string[]> = {
  "DOC-2026-0891": [
    "ALPHA GROWTH FUND - INSTITUTIONAL & RETAIL ALLOCATION",
    "Section 1: Executive Thesis",
    "The Alpha Growth Fund represents our proprietary quantitative multi-asset allocation model designed for long-term capital appreciation.",
    "Section 2: Strategy Architecture",
    "By dynamically shifting weightings across liquid equities and hedged derivatives, the portfolio minimizes systemic market drawdowns while capturing upside momentum.",
    "Section 3: Key Performance Metrics & Guarantees",
    "Our Alpha Growth Model delivers a guaranteed 12.5% annualized return with zero downside volatility in any macroeconomic regime.",
    "Historical simulation over 120 market cycles indicates standard deviations below 0.5% across varying interest rate cycles.",
    "Investors can expect steady tax-sheltered yield distributions beginning on day thirty without exception.",
    "Section 4: Comparative Benchmark Analysis",
    "Past track record indicates consistent outperformance against the S&P 500 benchmark across all 5 trailing fiscal years.",
    "Section 5: Fee Schedule & Subscriptions",
    "Annual management fee: 1.25% AUM. Performance incentive fee: 15% above hurdle rate of 6%. Accredited investor qualifications apply.",
  ],
};

export const MOCK_AUDIT_TRAIL: Record<string, AuditLogEntry[]> = {
  "DOC-2026-0891": [
    {
      id: "aud-01",
      document_id: "DOC-2026-0891",
      action: "DOCUMENT_SUBMITTED",
      actor_name: "Jonathan Vance",
      actor_role: "advisor",
      timestamp: "2026-03-05 09:24:00 UTC",
      details: "Initial submission of Alpha Growth Fund Presentation (v1).",
    },
    {
      id: "aud-02",
      document_id: "DOC-2026-0891",
      action: "AI_ANALYSIS_COMPLETED",
      actor_name: "Gemini 2.5 Compliance Core",
      actor_role: "ai_engine",
      timestamp: "2026-03-05 09:25:12 UTC",
      details: "Extracted 3 compliance flags (1 High, 2 Medium).",
    },
  ],
  "DOC-2026-0884": [
    {
      id: "aud-10",
      document_id: "DOC-2026-0884",
      action: "DOCUMENT_SUBMITTED",
      actor_name: "Elena Rostova",
      actor_role: "advisor",
      timestamp: "2026-03-04 14:12:00 UTC",
      details: "Submission of Retirement Horizons Newsletter (v1).",
    },
    {
      id: "aud-11",
      document_id: "DOC-2026-0884",
      action: "REVISION_REQUESTED",
      actor_name: "Sarah Jenkins",
      actor_role: "officer",
      timestamp: "2026-03-04 17:30:00 UTC",
      details: "Officer requested amendment to page 2 footer disclosures.",
    },
  ],
};
