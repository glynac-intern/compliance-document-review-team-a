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

export type ReviewDecisionStatus = "approved" | "rejected" | "needs_revision";

export interface DecisionPayload {
  status: ReviewDecisionStatus;
  comment?: string | null;
}

export interface ReviewResponse {
  id: string;
  document_id: string;
  officer_id: string;
  status: ReviewDecisionStatus;
  comment: string | null;
  decided_at: string;
}

export const reviewsApi = {
  getQueue: (statusFilter?: BackendDocumentStatus): Promise<QueueDocument[]> => {
    const query = statusFilter ? `?status=${statusFilter}` : "";
    return apiFetch<QueueDocument[]>(`/review/queue${query}`);
  },

  getDocument: (documentId: string): Promise<QueueDocument> =>
    apiFetch<QueueDocument>(`/review/documents/${documentId}`),

  submitDecision: (documentId: string, payload: DecisionPayload): Promise<ReviewResponse> =>
    apiFetch<ReviewResponse>(`/review/documents/${documentId}/decision`, {
      method: "POST",
      body: payload,
    }),
};
