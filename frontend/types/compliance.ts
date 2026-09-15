export type ComplianceStatus =
  | "pending"
  | "in_review"
  | "approved"
  | "needs_revision"
  | "rejected";

export type SeverityLevel = "high" | "medium" | "low";

export type DocumentType =
  | "Market Commentary"
  | "Presentation / Deck"
  | "Client Letter"
  | "Promotional Brochure"
  | "Social Media Post"
  | "Performance Factsheet"
  | "Other"
  | (string & {});

export interface AIFlag {
  passage: string;
  rule_id: string | null;
  explanation: string;
  severity: SeverityLevel;
}

export interface AIAnalysis {
  summary: string;
  flags: AIFlag[];
  analyzed_at?: string;
  status?: "idle" | "loading" | "ready" | "error" | "empty";
  error_message?: string;
}

export interface ComplianceDocument {
  id: string;
  title: string;
  advisor_id: string;
  advisor_name: string;
  advisor_email: string;
  status: ComplianceStatus;
  file_reference: string;
  type: DocumentType;
  uploaded_at: string;
  thread_id: string;
  replaces_document_id: string | null;
  version: number;
  file_size_mb: number;
  officer_feedback?: string;
  officer_name?: string;
  reviewed_at?: string;
  ai_summary?: string;
  revision_notes?: string;
  flags_count?: {
    high: number;
    medium: number;
    low: number;
  };
}

export interface ReviewDecisionPayload {
  decision: "approved" | "rejected" | "revision_requested";
  comments: string;
  flag_dispositions?: {
    passage: string;
    confirmed: boolean;
  }[];
}

export interface AuditLogEntry {
  id: string;
  document_id: string;
  action: string;
  actor_name: string;
  actor_role: "advisor" | "officer" | "ai_engine";
  timestamp: string;
  details?: string;
}
