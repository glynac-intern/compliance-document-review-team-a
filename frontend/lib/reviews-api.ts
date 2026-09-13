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

export const reviewsApi = {
  getQueue: (statusFilter?: BackendDocumentStatus): Promise<QueueDocument[]> => {
    const query = statusFilter ? `?status=${statusFilter}` : "";
    return apiFetch<QueueDocument[]>(`/review/queue${query}`);
  },
};
