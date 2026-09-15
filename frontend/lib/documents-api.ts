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
  revision_notes?: string | null;
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
  revision_notes?: string | null;
  review: ThreadReview | null;
}

export interface AuditEvent {
  id: string;
  actor_id: string;
  document_id: string;
  action: string;
  timestamp: string;
}

export type BackendAnalysisStatus = "not_started" | "in_progress" | "succeeded" | "failed";

export interface MatchedRule {
  id: string;
  text: string;
  type: string;
}

export interface BackendFlag {
  id: string;
  passage_excerpt: string;
  matched_rule: MatchedRule | null;
  explanation: string;
  severity: string;
}

export interface BackendPrecedent {
  document_id: string;
  masked_text: string;
  decision: string;
  comment: string | null;
}

export interface BackendAnalysis {
  id: string;
  document_id: string;
  status: BackendAnalysisStatus;
  error_message: string | null;
  summary: string | null;
  generated_at: string | null;
  flags: BackendFlag[];
  precedents: BackendPrecedent[];
}

export const documentsApi = {
  list: (): Promise<BackendDocument[]> => apiFetch<BackendDocument[]>("/documents"),

  getThread: (documentId: string): Promise<ThreadEntry[]> =>
    apiFetch<ThreadEntry[]>(`/documents/${documentId}/thread`),

  getAudit: (documentId: string): Promise<AuditEvent[]> =>
    apiFetch<AuditEvent[]>(`/documents/${documentId}/audit`),

  getAnalysis: (documentId: string): Promise<BackendAnalysis> =>
    apiFetch<BackendAnalysis>(`/documents/${documentId}/analysis`),

  retryAnalysis: (documentId: string): Promise<BackendAnalysis> =>
    apiFetch<BackendAnalysis>(`/documents/${documentId}/analysis/retry`, {
      method: "POST",
    }),

  downloadFile: async (documentId: string, fallbackFilename?: string): Promise<void> => {
    const token = getStoredToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/file`, {
      headers,
    });
    if (!response.ok) {
      let detail = `Download failed (${response.status})`;
      try {
        const body = await response.json();
        if (body?.detail) {
          detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
        }
      } catch {
        // non-JSON response body
      }
      throw new ApiError(response.status, detail);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;

    const disposition = response.headers.get("content-disposition");
    let filename = fallbackFilename || "document";
    if (disposition && disposition.includes("filename=")) {
      const match = disposition.match(/filename=["']?([^"';]+)["']?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

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

  /**
   * TA-65: submits a revision against a needs_revision document. Same
   * XHR-for-real-progress pattern as submit() above -- reused rather
   * than duplicated logic with a different endpoint path.
   */
  submitRevision: (
    originalDocumentId: string,
    file: File,
    onProgress: (percent: number) => void,
    comment?: string
  ): Promise<BackendDocument> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append("file", file);
      if (comment && comment.trim()) {
        formData.append("comment", comment.trim());
      }

      xhr.open("POST", `${API_BASE_URL}/documents/${originalDocumentId}/revisions`);
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
          // TA-65: the server's rejection (e.g. "This document has
          // already been revised") must be surfaced clearly -- read
          // the real detail message, same as the main submit() path.
          let detail = `Revision submission failed (${xhr.status})`;
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
