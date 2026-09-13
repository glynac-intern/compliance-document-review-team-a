/**
 * TA-63: Maps a REAL backend document (documents/schemas.py's
 * DocumentResponse) into the shape the existing (mock-data-era) UI
 * components expect. The backend doesn't track everything the old
 * mock type assumed (advisor_name, file_size_mb, a content-category
 * "type") -- those are filled with honest, clearly-derived values
 * rather than invented data:
 *   - advisor_name/email: the CURRENT logged-in advisor, since this
 *     view only ever shows the advisor's OWN submissions
 *   - type: the backend's real file format (pdf/docx/xlsx), shown as
 *     a readable label -- there is no content-category ("Market
 *     Commentary" etc.) anywhere in the real API
 *   - file_size_mb: known at upload time from the File object itself,
 *     not returned by the list endpoint -- omitted (0) for documents
 *     loaded from the server, since the size isn't actually knowable
 *     after the fact (TA-25 deliberately doesn't expose the file path)
 */

import type { BackendDocument, BackendDocumentStatus } from "./documents-api";
import type { ComplianceDocument, ComplianceStatus, DocumentType } from "@/types/compliance";

const STATUS_MAP: Record<BackendDocumentStatus, ComplianceStatus> = {
  pending_review: "pending",
  approved: "approved",
  rejected: "rejected",
  needs_revision: "needs_revision",
};

const FILE_TYPE_LABELS: Record<string, DocumentType> = {
  pdf: "Presentation / Deck",
  docx: "Client Letter",
  xlsx: "Performance Factsheet",
};

export function adaptBackendDocument(
  doc: BackendDocument,
  advisorName: string,
  advisorEmail: string
): ComplianceDocument {
  return {
    id: doc.id,
    title: doc.original_filename ?? `Document ${doc.id.slice(0, 8)}`,
    advisor_id: doc.advisor_id,
    advisor_name: advisorName,
    advisor_email: advisorEmail,
    status: STATUS_MAP[doc.status] ?? "pending",
    file_reference: "", // TA-25 deliberately never exposes this
    type: FILE_TYPE_LABELS[doc.type] ?? "Presentation / Deck",
    uploaded_at: doc.uploaded_at,
    thread_id: doc.thread_id,
    replaces_document_id: doc.replaces_document_id,
    version: 1, // real revision count needs the /thread endpoint (separate ticket)
    file_size_mb: 0, // not knowable from the list endpoint after upload
  };
}
