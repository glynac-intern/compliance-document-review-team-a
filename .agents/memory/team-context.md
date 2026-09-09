# Team Context & Frontend Architectural Roadmap: Verity

**Team**: Team A (Glynac Capture the Flag)  
**Role**: Lead Frontend Architect & UI/UX Engineer  
**Date**: September 2026  
**Status**: Active Production Development

---

## 1. Product & Domain Context

**Verity** is a compliance document review platform designed for broker-dealers, investment banks, and wealth management firms. It enables financial advisors to submit client-facing promotional and marketing materials for regulatory pre-screening and formal compliance officer review against SEC/FINRA rules.

### Core User Personas
1. **James Adams (`advisor`)**: Senior Wealth Management Advisor. Submits pitch decks, letters, commentaries, and fact sheets. Tracks real-time status in his dashboard, reviews officer feedback, and submits revisions when needed.
2. **Sarah Jenkins (`officer`)**: Registered Compliance Principal / Officer. Inspects incoming submissions in a global queue, reviews original documents side-by-side with AI-detected compliance flags, examines 3 similar historical precedents, and renders binding approval, rejection, or revision decisions.

---

## 2. Cross-Track Progress & System Architecture

### 2.1 AI Engineering Track
* **Responsibilities**: Server-side PII masking, LLM prompt engineering with Google Gemini, automated summarization, compliance flag detection with rule citation, and explanation generation.
* **Pipeline Status**:
  * PII masking stubbed: Stable placeholder replacement (`[CLIENT_1]`, `[EMAIL_1]`). Unmasked text is strictly blocked from leaving the server.
  * AI Output Schema: Standardized to `{ summary: string, flags: [{ passage, matched_rule_id, explanation, severity }] }`.
  * Human Decision Boundary: AI has no authority to alter document state; it acts strictly as an advisory co-pilot.
  * Degraded State: Fallback error state with `[Retry Analysis]` action button when AI credentials or network calls fail.

### 2.2 Data Engineering Track
* **Responsibilities**: Text extraction across PDF, DOCX, and multi-sheet XLSX; clean-text normalization; chunking; vector embeddings generation; vector store management via `pgvector`; and executing 3 distinct retrieval jobs:
  1. **Compliance Rule Retrieval**: Matching document passages to relevant SEC/FINRA regulatory rules.
  2. **Missing-Disclosure Detection**: Identifying mandatory statutory disclosures omitted from client collateral.
  3. **Precedent Search**: Retrieving the top 3 similar historical document submissions and their respective compliance outcomes.
* **Status**: Module directory scaffolding in place (`data_pipeline/chunking`, `embeddings`, `evaluation`, `extraction`, `retrieval`).

### 2.3 Backend API Track
* **Responsibilities**: FastAPI application core, session & JWT authentication, database persistence via PostgreSQL 16, document upload validation ($\le$ 10 MB), revision threading, audit event logging, and role enforcement.
* **Status**: Routers scaffolded in `backend/` (`auth`, `documents`, `reviews`, `notifications`, `audit`). Endpoints currently return HTTP 501 stubs while database tables and business logic are being implemented.

### 2.4 Frontend Track (Current Progress)
* **Design Authority**: Firmly anchored on `frontend/app/login/page.tsx`.
* **Completed & Refined**:
  * **Login Experience**: Enterprise login screen with branded 3D shaded blue orbs, interactive swipable value proposition cards, role-selection modal (`advisor` vs `officer`), and credential validation.
  * **Advisor Dashboard (`frontend/app/advisor/page.tsx`)**:
    * Clean collapsible sidebar with custom hand-drawn `NewSubmissionDocIcon` (filled theme-colored document with prominent white `+` add button) and minimal 20px icons (`Layers2`, `Files`, `BarChart2`, `History`).
    * Non-bold CamelCase Inter section headers (`Workspace`, `Analysis`).
    * Metric cards with preserved brand navy gradients, Geometric Sans-Serif numerals (`06`, `03`, `01`, `01`), and lowercase Inter subtext.
    * Recent Submissions table featuring search, status filter dropdown, last-updated sorting, advanced document type filtering, and **pure text status indicators** (theme navy for pending, deep wine bold for rejected).
    * Interactive Document Inspector Drawer, New Submission upload modal, Revision upload modal, Certificate download modal, and Recent Activity panel.
* **Discarded Work**:
  * Purged all elements from a generic third-party dashboard template (`clarity.`) that introduced cluttered KPI cards, unrequested horizontal status pill tabs, and generic admin styling.
  * Eliminated bulky square container boxes around sidebar icons.
  * Removed all generic status icons (clocks, warning triangles) and pill borders from status displays.

---

## 3. Comprehensive Frontend Roadmap

### 3.1 Information Architecture (IA)
```
                                 [ / (Root) ]
                                      │
                                      ▼
                                [ /login ]
                                      │
                 ┌────────────────────┴────────────────────┐
                 ▼ (Role: Advisor)                         ▼ (Role: Officer)
          [ /advisor ]                               [ /officer ]
                 │                                         │
        ┌────────┴────────┐                       ┌────────┴────────┐
        ▼                 ▼                       ▼                 ▼
   Overview          My Submissions          Review Queue       Officer Metrics
   - Metric Cards    - Full Table            - Filterable Queue - Queue Velocity
   - Recent Table    - Revision Threads      - Search & Sort    - SLA Indicators
   - New Modal       - Inspector Drawer      - High Risk Flags
   - Revise Modal    - Cert Download
                                                          │
                                                          ▼
                                            [ /officer/review/[id] ]
                                            - Split-Screen Viewer
                                            - Original Doc (PDF/DOCX/XLSX)
                                            - AI Assist (Summary & Flags)
                                            - Top-3 Similar Precedents
                                            - Review Decision Panel
```

### 3.2 Screen Inventory

| Screen Path | Target Role | Primary Purpose | Status |
| :--- | :--- | :--- | :--- |
| `app/login/page.tsx` | All Users | Brand entry point, credentials, SSO/Demo role switcher | ✅ Complete (Design Source of Truth) |
| `app/advisor/page.tsx` | Advisor | Collateral overview, metric cards, submissions table, intake | ✅ Complete & Aligned to Blueprint |
| `app/officer/page.tsx` | Officer | Global compliance review queue, SLA tracking, risk prioritization | 🟡 Pending Implementation |
| `app/officer/review/[id]/page.tsx` | Officer | Split-screen document review, AI assist panel, decision capture | 🟡 Pending Implementation |
| `components/advisor/document-inspector-drawer.tsx` | Advisor | Quick slide-out inspection of advisor filing details | ✅ Complete |
| `components/advisor/new-submission-modal.tsx` | Advisor | Document upload, metadata selection, validation | ✅ Complete |
| `components/advisor/revision-upload-modal.tsx` | Advisor | Upload new draft linked to rejected/revision thread | ✅ Complete |
| `components/advisor/certificate-modal.tsx` | Advisor | Display & print digital compliance approval certificate | ✅ Complete |

### 3.3 Component Inventory

1. **Layout Components**:
   * `Sidebar`: Responsive collapsible rail (`260px` $\leftrightarrow$ `68px`), custom brand iconography, profile strip.
   * `TopBar`: Breadcrumb trail, theme-activated utility buttons (Reload, Notifications, Calendar).
2. **Data Presentation Components**:
   * `SubmissionsTable`: Searchable, filterable data grid with text-only status typography.
   * `MetricCards`: Gradient-filled cards displaying Geometric numerals.
   * `RecentActivity`: Real-time audit and status change timeline.
3. **Officer Review Components (To Build)**:
   * `OfficerQueueTable`: Enhanced queue showing Advisor Name, Risk Score, AI Flag count, and Days in Queue.
   * `DocumentViewer`: High-fidelity renderer supporting PDF page navigation, DOCX text layout, and XLSX sheets.
   * `AIAssistPanel`: Grouped summary, categorized flags (with passage citations and matched rules), and top 3 precedent cards.
   * `ReviewDecisionPanel`: Human decision selector (`Approved`, `Needs Revision`, `Rejected`), mandatory comment box, and audit sign-off.
4. **Design System & UI Primitives**:
   * `StatusBadge`: Clean, icon-free Inter text status indicator.
   * `VerityLogo`: Official scalable logo mark and wordmark.
   * `Button`, `Input`, `Dialog`, `Table`, `Tabs`, `Card`, `Badge`.

### 3.4 API Integration Plan

| Frontend Flow | Backend Endpoint | Method | Data Payload / Response |
| :--- | :--- | :--- | :--- |
| **Authentication** | `/auth/login` | `POST` | Send credentials $\rightarrow$ Receive JWT & user role |
| **Advisor Queue** | `/documents` | `GET` | Fetch advisor-filtered submissions array |
| **File Intake** | `/documents` | `POST` | Multipart file upload ($\le$ 10 MB) $\rightarrow$ Returns new `document_id` |
| **Draft Revision** | `/documents/{id}/revisions` | `POST` | Multipart file upload $\rightarrow$ Links to parent `thread_id` |
| **Officer Queue** | `/review/queue` | `GET` | Fetch all pending submissions with AI risk ratings |
| **Review Detail** | `/review/documents/{id}` | `GET` | Fetch document URL, extracted text, AI summary, flags, precedents |
| **Human Decision** | `/review/documents/{id}/decision` | `POST` | Submit decision (`approved` / `rejected` / `needs_revision`) + comments |
| **AI Re-Analysis** | `/documents/{id}/analysis/retry`| `POST` | Trigger fresh AI pre-screening after previous failure |
| **Audit Log** | `/documents/{id}/audit` | `GET` | Fetch chronological audit history of events |

### 3.5 Frontend Milestone Plan

* **Milestone 1: Establish Persistent Memory & Authority** (Current)
  * Populate all 5 memory files in `.agents/memory/`.
  * Verify full alignment between Blueprint v0.2, Login source of truth, and Advisor Dashboard.
* **Milestone 2: Compliance Officer Review Queue (`app/officer/page.tsx`)**
  * Build the Officer Review Queue honoring all UI rules and the Login visual authority.
  * Integrate search, status filters, priority risk tags, and quick-inspection drawer.
* **Milestone 3: Officer Review Workspace (`app/officer/review/[id]/page.tsx`)**
  * Implement split-screen architecture (Original Document Viewer + AI Assist Panel).
  * Build traceable AI flag cards citing triggering passages, matched rules, and risk severities.
  * Implement Top 3 Precedent comparisons.
  * Build Review Decision Panel with graceful degradation handling.
* **Milestone 4: Live Backend API Integration**
  * Replace mock data hooks with typed Fetch/SWR queries against FastAPI endpoints.
  * Wire multipart file upload with progress bar.
* **Milestone 5: Verification & Release Packaging**
  * Production build validation (`npm run build`).
  * Cross-role verification (Advisor $\leftrightarrow$ Officer workflow loop).
