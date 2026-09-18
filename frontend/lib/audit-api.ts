/**
 * TA-106: officer-wide audit log, backed by GET /audit -- a real
 * cross-document endpoint, distinct from the per-document
 * /documents/{id}/audit used on the document detail page.
 */
import { apiFetch } from "./api-client";

export type AuditActionType =
  | "DOCUMENT_SUBMITTED"
  | "DOCUMENT_VIEWED"
  | "DECISION_APPROVED"
  | "DECISION_REVISION"
  | "DECISION_REJECTED"
  | "REVISION_UPLOADED"
  | "REMINDER_SENT";

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor_name: string;
  actor_role: string;
  action_type: AuditActionType;
  document_id: string;
  document_title: string;
  details: string;
}

export const auditApi = {
  getAuditLog: (): Promise<AuditLogEntry[]> => apiFetch<AuditLogEntry[]>("/audit"),
};
