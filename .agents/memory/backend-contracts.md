# Backend Contracts & API Specifications: Verity

**Backend Framework**: FastAPI (Python 3.12 / Uvicorn)  
**Database**: PostgreSQL 16 with `pgvector`  
**Authentication**: Session / JWT Token with Server-Side RBAC  
**Status**: Routers scaffolded; pending database migrations and endpoint implementation

---

## 1. Authentication & RBAC Contracts

Role enforcement occurs strictly on the server. Client-side claims are validated against the database session on every authenticated request.

### 1.1 `POST /auth/signup`
Creates a new enterprise user account.
* **Request Payload**:
  ```json
  {
    "name": "Sarah Jenkins",
    "email": "sarah.jenkins@verity.internal",
    "password": "SecurePassword123!",
    "role": "officer" // "advisor" | "officer"
  }
  ```
* **Response (201 Created)**:
  ```json
  {
    "id": "usr_99812",
    "name": "Sarah Jenkins",
    "email": "sarah.jenkins@verity.internal",
    "role": "officer",
    "token": "eyJhbGciOiJIUzI1NiIsIn..."
  }
  ```

### 1.2 `POST /auth/login`
Authenticates user credentials and returns session token.
* **Request Payload**:
  ```json
  {
    "email": "james.adams@verity.internal",
    "password": "SecurePassword123!"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "user": {
      "id": "usr_10024",
      "name": "James Adams",
      "email": "james.adams@verity.internal",
      "role": "advisor"
    },
    "token": "eyJhbGciOiJIUzI1NiIsIn..."
  }
  ```

### 1.3 `GET /auth/me`
Retrieves current authenticated session user.
* **Headers**: `Authorization: Bearer <token>`
* **Response (200 OK)**: User profile object.

---

## 2. Advisor Document Workflow Endpoints

### 2.1 `POST /documents` (Multipart Upload)
Intake endpoint for initial document submission.
* **Role**: `advisor` only (Officers receive `403 Forbidden`).
* **Content-Type**: `multipart/form-data`
* **Form Fields**:
  * `file`: Binary file (PDF, DOCX, XLSX, $\le$ 10.0 MB).
  * `title`: string (e.g., `"Q3 Apex Growth Strategy Deck"`).
  * `type`: string (`"Market Commentary" | "Presentation / Deck" | "Client Letter" | "Promotional Brochure" | "Social Media Post" | "Performance Factsheet"`).
* **Response (201 Created)**:
  ```json
  {
    "id": "DOC-8821",
    "title": "Q3 Apex Growth Strategy Deck",
    "status": "pending",
    "advisor_id": "usr_10024",
    "type": "Presentation / Deck",
    "uploaded_at": "2026-09-09T14:32:00Z",
    "thread_id": "thr_00192",
    "version": 1,
    "file_size_mb": 3.8
  }
  ```
* **Error States**:
  * `413 Payload Too Large`: File exceeds 10 MB limit.
  * `415 Unsupported Media Type`: Non-supported extension or MIME signature.

### 2.2 `GET /documents`
Lists all documents submitted by the authenticated advisor.
* **Role**: `advisor`
* **Query Parameters**:
  * `status`: Optional filter (`pending`, `in_review`, `approved`, `needs_revision`, `rejected`).
  * `type`: Optional document type filter.
  * `sort`: `"newest" | "oldest" | "title"`.
* **Response (200 OK)**: Array of `ComplianceDocument` objects.

### 2.3 `POST /documents/{document_id}/revisions`
Uploads a revised draft linked to an existing submission.
* **Role**: `advisor`
* **Path Parameter**: `document_id` (the ID of the document being revised).
* **Form Fields**: `file` (binary), `revision_notes` (string).
* **Behavior**:
  * Validates that parent document status is `needs_revision`.
  * Increments `version` ($v_n \rightarrow v_{n+1}$).
  * Inherits the same `thread_id`.
  * Sets `previous_revision_id = document_id`.
  * Transitions new revision state to `pending`.

### 2.4 `GET /documents/{document_id}/analysis`
Fetches the cached AI compliance pre-screening summary and flags.
* **Response (200 OK)**:
  ```json
  {
    "document_id": "DOC-8821",
    "summary": "Marketing deck detailing the Apex High-Yield Strategy for retail clients.",
    "analysis_status": "ready", // "loading" | "ready" | "error"
    "generated_at": "2026-09-09T14:35:10Z",
    "flags": [
      {
        "passage": "Guaranteed 14% annual returns regardless of broader market volatility.",
        "matched_rule_id": "FINRA-2210-PROMISSORY",
        "explanation": "Guarantees on market-linked securities violate FINRA Rule 2210.",
        "severity": "high"
      }
    ]
  }
  ```

---

## 3. Compliance Officer Review Endpoints

### 3.1 `GET /review/queue`
Global review queue listing all advisor submissions requiring compliance review.
* **Role**: `officer` only (Advisors receive `403 Forbidden`).
* **Query Parameters**: `status`, `advisor_id`, `sort`, `page`, `limit`.
* **Response (200 OK)**: Array of submissions with officer assignment status and AI risk scores.

### 3.2 `GET /review/documents/{document_id}`
Comprehensive officer review payload including original file URL, masked text, extracted sections, AI analysis, and top 3 similar precedents.
* **Response (200 OK)**:
  ```json
  {
    "document": { ... },
    "file_url": "/api/files/DOC-8821.pdf",
    "extracted_text": "...",
    "ai_analysis": { ... },
    "precedents": [
      {
        "document_id": "DOC-7201",
        "title": "Alpha Growth Presentation v2",
        "similarity_score": 0.88,
        "decision": "approved",
        "officer_comment": "Approved after advisor removed promissory return figures."
      }
    ]
  }
  ```

### 3.3 `POST /review/documents/{document_id}/decision`
Authoritative human compliance decision endpoint.
* **Role**: `officer`
* **Request Payload**:
  ```json
  {
    "decision": "needs_revision", // "approved" | "rejected" | "needs_revision"
    "comment": "Please remove guaranteed yield claims on slide 4 and insert mandatory FINRA risk disclosure.",
    "flag_dispositions": [
      { "flag_id": "flg_01", "confirmed": true }
    ]
  }
  ```
* **State Transition Enforcement**:
  * `approved` $\rightarrow$ Transitions document to `APPROVED`. Generates digital compliance approval certificate.
  * `rejected` $\rightarrow$ Transitions document to `REJECTED`. Locks thread from future revisions.
  * `needs_revision` $\rightarrow$ Transitions document to `NEEDS_REVISION`. Enables revision upload button for advisor.

---

## 4. Internal Data Pipeline & AI Contracts

These contracts govern internal asynchronous processing across the data engineering and AI tracks:

```
[Backend Upload] ──> document_id, file_ref, file_type
        │
        ▼
[Extraction]    ──> document_id, extracted_text, sections, metadata
        │
        ▼
[PII Masker]    ──> document_id, masked_text, safe_metadata
        │
        ▼
[DE Vector Job] ──> Embeds masked_text into pgvector -> Retrieves top rules & 3 precedents
        │
        ▼
[Gemini LLM]    ──> Receives masked_text + retrieved context -> Generates summary & flags
        │
        ▼
[DB Cache]      ──> Stores final AI analysis for instant Officer UI rendering
```

---

## 5. Database Schema & Relational Model (PostgreSQL)

```sql
-- Core Users Table
CREATE TABLE users (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(32) NOT NULL CHECK (role IN ('advisor', 'officer')),
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Documents Table
CREATE TABLE documents (
  id VARCHAR(64) PRIMARY KEY,
  advisor_id VARCHAR(64) NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'approved', 'needs_revision', 'rejected')),
  file_reference VARCHAR(512) NOT NULL,
  file_type VARCHAR(16) NOT NULL CHECK (file_type IN ('pdf', 'docx', 'xlsx')),
  file_size_mb NUMERIC(5,2) NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  thread_id VARCHAR(64) NOT NULL,
  previous_revision_id VARCHAR(64) REFERENCES documents(id),
  version INTEGER NOT NULL DEFAULT 1
);

-- Review Decisions Table
CREATE TABLE review_decisions (
  id VARCHAR(64) PRIMARY KEY,
  document_id VARCHAR(64) NOT NULL REFERENCES documents(id),
  officer_id VARCHAR(64) NOT NULL REFERENCES users(id),
  decision VARCHAR(32) NOT NULL CHECK (decision IN ('approved', 'needs_revision', 'rejected')),
  comment TEXT NOT NULL,
  decided_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI Analyses Table
CREATE TABLE ai_analyses (
  id VARCHAR(64) PRIMARY KEY,
  document_id VARCHAR(64) NOT NULL REFERENCES documents(id),
  summary TEXT NOT NULL,
  analysis_status VARCHAR(32) NOT NULL DEFAULT 'ready',
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Compliance Flags Table
CREATE TABLE compliance_flags (
  id VARCHAR(64) PRIMARY KEY,
  analysis_id VARCHAR(64) NOT NULL REFERENCES ai_analyses(id),
  passage TEXT NOT NULL,
  matched_rule_id VARCHAR(128),
  explanation TEXT NOT NULL,
  severity VARCHAR(16) NOT NULL CHECK (severity IN ('high', 'medium', 'low'))
);

-- Append-Only Audit Events Table
CREATE TABLE audit_events (
  id VARCHAR(64) PRIMARY KEY,
  actor_id VARCHAR(64) NOT NULL,
  actor_role VARCHAR(32) NOT NULL,
  document_id VARCHAR(64) NOT NULL,
  action VARCHAR(64) NOT NULL,
  details TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```
