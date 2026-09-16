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
  revision_notes?: string | null;
}

export type DecisionStatus = "approved" | "rejected" | "needs_revision";
export type ReviewDecisionStatus = DecisionStatus;

export interface DecisionPayload {
  status: DecisionStatus;
  comment?: string | null;
}

export interface DecisionResponse {
  id: string;
  document_id: string;
  officer_id: string;
  status: DecisionStatus;
  comment: string | null;
  decided_at: string;
}

export type ReviewResponse = DecisionResponse;

export interface ReviewsApiClient {
  getQueue(statusFilter?: BackendDocumentStatus): Promise<QueueDocument[]>;
  getDocument(documentId: string): Promise<QueueDocument>;
  submitDecision(documentId: string, payload: DecisionPayload): Promise<DecisionResponse>;
  submitDecision(documentId: string, status: DecisionStatus, comment?: string): Promise<DecisionResponse>;
}

export const reviewsApi: ReviewsApiClient = {
  getQueue: (statusFilter?: BackendDocumentStatus): Promise<QueueDocument[]> => {
    const filter = statusFilter ?? "pending_review";
    const query = `?status=${filter}`;
    return apiFetch<QueueDocument[]>(`/review/queue${query}`);
  },

  getDocument: (documentId: string): Promise<QueueDocument> =>
    apiFetch<QueueDocument>(`/review/documents/${documentId}`),

  // TA-69: the actual decision action. The server rejects with a clear
  // 400 if the document is no longer pending -- that's surfaced as-is,
  // not re-implemented client-side.
  submitDecision: (
    documentId: string,
    statusOrPayload: DecisionStatus | DecisionPayload,
    comment?: string
  ): Promise<DecisionResponse> => {
    const payload: { status: DecisionStatus; comment: string | null } =
      typeof statusOrPayload === "string"
        ? { status: statusOrPayload, comment: comment?.trim() || null }
        : {
            status: statusOrPayload.status,
            comment: statusOrPayload.comment ? statusOrPayload.comment.trim() || null : null,
          };
    return apiFetch<DecisionResponse>(`/review/documents/${documentId}/decision`, {
      method: "POST",
      body: payload,
    });
  },
};
