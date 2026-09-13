/**
 * TA-63: Document submission and listing, wired to the REAL backend
 * response shape (documents/schemas.py's DocumentResponse) -- not the
 * richer, partly-invented ComplianceDocument type the existing mock UI
 * was built against (advisor_name, file_size_mb, and a content-category
 * "type" don't exist anywhere in the actual API).
 */

import { apiFetch, API_BASE_URL, getStoredToken, ApiError } from "./api-client";

export type BackendDocumentType = "pdf" | "docx" | "xlsx";
export type BackendDocumentStatus = "pending_review" | "approved" | "rejected" | "needs_revision";

export interface BackendDocument {
  id: string;
  advisor_id: string;
  status: BackendDocumentStatus;
  original_filename: string | null;
  type: BackendDocumentType;
  uploaded_at: string;
  thread_id: string;
  replaces_document_id: string | null;
}

// Mirrors the backend's real constraints (documents/router.py) -- surfaced
// client-side for fast feedback, but the server remains the authority.
export const ALLOWED_MIME_TYPES: Record<string, BackendDocumentType> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
};
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export function validateFileBeforeUpload(file: File): string | null {
  if (!(file.type in ALLOWED_MIME_TYPES)) {
    return "Only PDF, DOCX, and XLSX files are accepted.";
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "File is too large. The maximum size is 10MB.";
  }
  return null;
}

export interface ThreadReview {
  status: BackendDocumentStatus;
  comment: string | null;
  decided_at: string;
}

export interface ThreadEntry {
  document_id: string;
  status: BackendDocumentStatus;
  type: BackendDocumentType;
  uploaded_at: string;
  replaces_document_id: string | null;
  review: ThreadReview | null;
}

export interface AuditEvent {
  id: string;
  actor_id: string;
  document_id: string;
  action: string;
  timestamp: string;
}

export const documentsApi = {
  list: (): Promise<BackendDocument[]> => apiFetch<BackendDocument[]>("/documents"),

  getThread: (documentId: string): Promise<ThreadEntry[]> =>
    apiFetch<ThreadEntry[]>(`/documents/${documentId}/thread`),

  getAudit: (documentId: string): Promise<AuditEvent[]> =>
    apiFetch<AuditEvent[]>(`/documents/${documentId}/audit`),

  /**
   * Uses XMLHttpRequest rather than fetch() specifically because fetch
   * has no upload-progress event -- real progress reporting (not just
   * a spinner) needs XHR's upload.onprogress.
   */
  submit: (file: File, onProgress: (percent: number) => void): Promise<BackendDocument> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append("file", file);

      xhr.open("POST", `${API_BASE_URL}/documents`);
      const token = getStoredToken();
      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          let detail = `Upload failed (${xhr.status})`;
          try {
            const body = JSON.parse(xhr.responseText);
            if (body?.detail) {
              detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
            }
          } catch {
            // non-JSON error body -- keep the generic message
          }
          reject(new ApiError(xhr.status, detail));
        }
      };

      xhr.onerror = () => reject(new ApiError(0, "Network error during upload. Please try again."));

      xhr.send(formData);
    });
  },
};
