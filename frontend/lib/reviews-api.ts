/**
 * TA-66: officer's review queue -- separate from documentsApi since it
 * hits the reviews/ router, a distinct backend module from documents/.
 */

import { apiFetch } from "./api-client";
import type { BackendDocumentType, BackendDocumentStatus } from "./documents-api";

export interface QueueDocument {
  id: string;
  advisor_id: string;
  advisor_name: string;
  status: BackendDocumentStatus;
  original_filename: string | null;
  type: BackendDocumentType;
  uploaded_at: string;
  thread_id: string;
  replaces_document_id: string | null;
}

export type DecisionStatus = "approved" | "rejected" | "needs_revision";

export interface DecisionResponse {
  id: string;
  document_id: string;
  officer_id: string;
  status: DecisionStatus;
  comment: string | null;
  decided_at: string;
}

export const reviewsApi = {
  getQueue: (statusFilter?: BackendDocumentStatus): Promise<QueueDocument[]> => {
    const query = statusFilter ? `?status=${statusFilter}` : "";
    return apiFetch<QueueDocument[]>(`/review/queue${query}`);
  },

  // TA-69: the actual decision action. The server rejects with a clear
  // 400 if the document is no longer pending -- that's surfaced as-is,
  // not re-implemented client-side.
  submitDecision: (
    documentId: string,
    status: DecisionStatus,
    comment: string
  ): Promise<DecisionResponse> =>
    apiFetch<DecisionResponse>(`/review/documents/${documentId}/decision`, {
      method: "POST",
      body: { status, comment: comment.trim() || null },
    }),
};
