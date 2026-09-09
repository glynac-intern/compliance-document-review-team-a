# Project Memory: Verity Compliance Document Review Platform

**Program**: Glynac Capture the Flag — Intern Project Challenge  
**Team**: Team A  
**Architecture Blueprint**: v0.2  
**Final Release Deadline**: 25 September 2026  
**Primary Repository**: `compliance-document-review-team-a`

---

## 1. Executive Summary & Purpose

The **Verity Compliance Document Review Platform** is an enterprise-grade financial regulatory application engineered to provide a controlled, auditable, and human-supervised workflow for broker-dealers and Registered Investment Advisors (RIAs). 

In financial services, financial advisors must submit all customer-facing collateral—including marketing decks, pitch books, market commentaries, client letters, and performance factsheets—for compliance review before public dissemination. Non-compliant materials containing unsubstantiated promissory statements, misleading performance projections, or missing statutory disclosures can incur severe FINRA/SEC enforcement actions and substantial financial penalties.

Verity provides:
1. **Advisor Submission Portal**: Streamlined document intake, version control, and status tracking.
2. **AI-Assisted Pre-Screening**: Server-side PII masking followed by automated summarization, regulatory citation matching, missing-disclosure detection, and similar precedent retrieval via Google Gemini and `pgvector`.
3. **Compliance Officer Review Workspace**: High-efficiency review queue, split-screen document viewer, traceable AI flag inspection, and authoritative decision recording.
4. **Immutable Regulatory Audit Trail**: Complete append-only logging of every upload, view, analysis, revision, and decision event for regulatory examination readiness.

---

## 2. Core Architectural Principles

The platform is built on six inviolable architectural tenets defined in Software Blueprint v0.2:

### 2.1 Human-in-the-Loop (HITL)
* **Core Rule**: AI assists the Compliance Officer; it **never** makes final regulatory decisions.
* The AI engine is strictly prohibited from approving documents, rejecting documents, requesting revisions, or modifying document state transitions.
* Only a licensed Compliance Officer can record a final decision.

### 2.2 Privacy Before AI
* **Zero PII Exposure**: Personally Identifiable Information (PII) must be masked server-side *before* any text reaches an external Large Language Model (LLM) or embedding provider.
* Stable, reversible placeholders (e.g., `John Smith` → `[CLIENT_1]`, `123456789` → `[ACCOUNT_1]`) are substituted during text extraction.
* The mapping between placeholders and sensitive original values remains strictly within the internal server boundary and is never transmitted off-premise.

### 2.3 Retrieval Before Generation (RAG)
* To prevent LLM hallucinations and enforce regulatory rigor, relevant compliance rules, required disclosures, and historical precedents must be retrieved from the vector store (`pgvector`) *prior* to querying the LLM for compliance analysis.
* The LLM operates exclusively as a reasoning engine over verified, retrieved regulatory context.

### 2.4 Traceability & Attribution
* Every flagged compliance issue must be deterministic and fully auditable:
  1. **Triggering Document Passage**: Exact text segment excerpted from the uploaded document.
  2. **Matched Rule Citation**: Specific FINRA/SEC regulation or internal firm policy ID.
  3. **Reason & Explanation**: Clear narrative explaining the non-compliance rationale.
  4. **Severity Level**: `high`, `medium`, or `low`.

### 2.5 Graceful Degradation
* External AI outages, rate limits, or missing credentials must **never block** human compliance review.
* If the AI service fails or times out, the Compliance Officer review workspace must load normally, render the original document, and enable the officer to approve, reject, or request revisions manually with an explicit error/retry status badge displayed in the AI Assist panel.

### 2.6 Clean-Checkout & Reproducibility
* The entire platform (PostgreSQL with `pgvector`, FastAPI backend, Next.js frontend, and seed databases) must run out-of-the-box via `docker-compose up`.
* Deterministic synthetic seed data enables comprehensive local testing without real-world client data.

---

## 3. User Roles & Permission Boundaries

The system enforces strict Role-Based Access Control (RBAC) at the API gateway layer:

| Dimension | Financial Advisor (`advisor`) | Compliance Officer (`officer`) |
| :--- | :--- | :--- |
| **Primary Goal** | Draft, upload, and track marketing/client collateral | Review queue, evaluate AI flags, render regulatory decisions |
| **Document Actions** | Upload initial files, upload revised drafts, download certificates | View all submissions, assign review, record decision + comments |
| **Access Boundary** | Can only access their own submissions and related revision threads | Global queue access across all advisor submissions |
| **AI Insights Access** | Receives finalized officer comments and summary notices | Full access to AI summaries, flagged passages, rules, precedents |
| **Endpoint Enforcement** | Attempting to access `/review/*` returns `403 Forbidden` | Attempting to upload to `/documents` returns `403 Forbidden` |

---

## 4. End-to-End Business Workflow

```
       ┌─────────────────────────────────────────────────────────┐
       │                   Financial Advisor                     │
       │  Submits PDF/DOCX/XLSX (<= 10MB) via Advisor Dashboard  │
       └────────────────────────────┬────────────────────────────┘
                                    │ POST /documents
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │                      Backend API                        │
       │   Validates MIME/Size, Persists File, Generates v1 ID   │
       │          Sets Document State = PENDING_REVIEW           │
       └────────────────────────────┬────────────────────────────┘
                                    │
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │              Data Pipeline & AI Orchestrator            │
       │  1. Extract Raw Text (PDF / DOCX / XLSX)                │
       │  2. Server-Side PII Masking (Stable Placeholders)       │
       │  3. Chunking & Embeddings Generation                    │
       │  4. Vector Similarity Search (Rules, Disclosures, Top-3)│
       │  5. Gemini LLM Analysis (Summary + Traceable Flags)     │
       │  6. Cache Results in Database                           │
       └────────────────────────────┬────────────────────────────┘
                                    │
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │                   Compliance Officer                    │
       │  Accesses Review Queue -> Opens Split-Screen Workspace  │
       │  Inspects Original Document vs AI Flags vs Precedents   │
       └────────────────────────────┬────────────────────────────┘
                                    │
                  ┌─────────────────┴─────────────────┐
                  │ POST /review/documents/{id}/decision
                  ▼                                   ▼
        ┌───────────────────┐               ┌───────────────────┐
        │     APPROVED      │               │  NEEDS REVISION   │ (or REJECTED)
        └─────────┬─────────┘               └─────────┬─────────┘
                  │                                   │
                  ▼                                   ▼
       ┌─────────────────────┐             ┌─────────────────────┐
       │ Advisor Receives    │             │ Advisor Uploads     │
       │ Approval & Digital  │             │ New Draft (v2)      │
       │ Compliance Cert     │             │ Re-enters Queue     │
       └─────────────────────┘             └─────────────────────┘
```

---

## 5. Document Lifecycle State Machine

The document state machine allows only deterministic transitions:

* `PENDING_REVIEW`: Default state upon initial upload or revision upload. Document is visible in the Compliance Review Queue.
* `IN_REVIEW`: Optional active lock when an officer opens the review workspace.
* `APPROVED`: Document is cleared for client dissemination. The advisor can view approval timestamps and download the compliance certificate.
* `NEEDS_REVISION`: Compliance officer flagged issues and provided mandatory feedback. The advisor is prompted to submit a new version linked to the same `thread_id`.
* `REJECTED`: Collateral is fundamentally non-compliant and prohibited from release. Cannot be revised within the same thread; requires a fresh submission.

All revisions belong to the same logical `thread_id`. Revision relationships are stored via `previous_revision_id`, preserving an immutable genealogy from v1 to final approval.

---

## 6. Supported File Types & Validation Constraints

* **Formats**: `.pdf` (Portable Document Format), `.docx` (Microsoft Word), `.xlsx` (Microsoft Excel).
* **Maximum File Size**: 10.0 MB.
* **Extraction Resilience**: Multi-sheet XLSX handling, tabular data preservation, and extraction fallback mechanisms.
* **Malicious File Protection**: File signature (magic byte) validation, extension whitelisting, and secure disk isolation.

---

## 7. Milestone Timeline & Engineering Schedule

* **Phase 0 (26–28 Aug)**: Architecture, repository scaffolding, Docker compose, blueprint agreement.
* **Week 1 (29 Aug–4 Sep)**: Core application workflow without AI dependency (Auth, Advisor Upload, Officer Queue, Manual Decisions, State Machine).
* **Week 2 (5–11 Sep)**: AI & Data Pipeline integration (Text extraction, PII masking, `pgvector` store, Gemini LLM summary and flags, graceful degradation).
* **Week 3 (12–18 Sep)**: Compliance intelligence & advanced features (Missing-disclosure detection, 3 similar precedents, revision linking, audit logs).
* **Week 4 (19–23 Sep)**: Hardening, end-to-end testing, feature freeze, release candidate packaging.
* **Final Delivery (25 Sep 2026)**: Final clean checkout verification, automated test suite run, and submission.
