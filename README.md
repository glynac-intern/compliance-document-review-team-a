# Compliance Document Review App

Glynac Capture the Flag intern challenge — Team A.

An internal tool for financial advisors to submit client-facing documents
for compliance review, with an AI assist (summary, flags, PII masking,
disclosure-by-absence detection) to help officers review faster and more
consistently.

## Prerequisites

- Docker Desktop (with WSL2 integration if on Windows)
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
  (free tier is sufficient for development)

## Setup

1. **Clone the repo:**
   ```bash
   git clone https://github.com/aufa-glynac/compliance-document-review-team-a.git
   cd compliance-document-review-team-a
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set:
   - `POSTGRES_PASSWORD` — any value
   - `BACKEND_SECRET_KEY` — generate one with `openssl rand -hex 32`
   - `LLM_API_KEY` — your Gemini API key from Google AI Studio

3. **Start the database and backend:**
   ```bash
   docker compose up -d db backend
   ```

4. **Run database migrations:**
   ```bash
   docker compose run --rm backend alembic upgrade head
   ```

5. **Seed the rules/disclosures corpus** (required for retrieval and
   disclosure-by-absence detection to work):
   ```bash
   docker compose run --rm backend python data_pipeline/embeddings/embed_rules.py
   ```

6. **Seed the precedent index** (TA-59 -- without this, precedent search
   demonstrates as an empty state on a fresh checkout, even though the
   feature works correctly):
   ```bash
   docker compose run --rm backend python data_pipeline/embeddings/backfill_precedents.py
   ```
   Populates precedent_index with the seed corpus's 100 documents, each
   carrying a plausible, varied decision and officer comment (no real
   client data -- these are synthetic seed documents).

7. **Verify the backend is running:**
   ```bash
   curl http://localhost:8000/health
   ```
   Should return `{"status":"ok"}`.

8. **Start the frontend** (once its own Dockerfile/service is ready):
   ```bash
   docker compose up -d frontend
   ```
   Visit `http://localhost:3000`.

## Running tests

```bash
docker compose run --rm backend pytest tests/ -v
```

Covers the role boundary (advisor/officer access enforcement, tested in
both directions) and the PII masker (entity detection, documented
limitations, round-trip unmasking). Tests run against a dedicated test
database (`compliance_test_db`), created automatically on first run —
separate from your dev data.

## API documentation

With the backend running, interactive API docs (Swagger UI) are available
at `http://localhost:8000/docs`.

## Project structure

```
backend/            FastAPI app: auth, documents, reviews, audit, notifications
ai/                 PII masking, LLM-based flag generation, summarization
data_pipeline/       Text extraction, chunking, embeddings, retrieval
seed/               Rules/disclosures corpus, generated sample documents
frontend/           Next.js frontend
```

## Current status

- **Backend**: auth (JWT, role-based), document submission/revision/audit
  trail, officer review queue and decisions — built and tested.
- **AI pipeline**: PII masking, rule retrieval, disclosure-by-absence
  detection (paragraph-chunked, threshold=0.20, validated at 100% accuracy
  on the seed corpus), flag generation, and summarization — built, wired
  into the API with caching and graceful degradation, and tested.
- **Frontend**: Next.js app scaffolded and containerized.
- **Tests**: role boundary and PII masker covered (18 tests). Broader
  coverage (documents CRUD, revisions, disclosure-by-absence integration)
  not yet automated.

## Notes on the AI setup

- LLM calls use `gemini-3.5-flash-lite` (chosen for its higher free-tier
  rate limit — 15 RPM vs. 5 RPM on some other models — since this project
  makes several calls per document during development/testing).
- The Gemini free tier requires no billing account; exceeding quota
  returns a `429` error rather than incurring any charge.
- PII is masked server-side before any text reaches the LLM vendor. The
  mapping between placeholders and real values never leaves the server.

## Security (TA-14 — pre-freeze hardening pass)

**Password policy.** Sign-up requires at least 8 characters, at least
one letter, and at least one digit. This is a minimum bar appropriate
for a project at this stage — not enterprise-grade complexity rules
(no forced special characters, no rotation policy).

**Token lifetime.** JWTs are valid for 8 hours — a deliberate choice,
not a development-convenience leftover: long enough to cover a full
workday without forcing re-login mid-session, short enough to bound how
long a leaked or stolen token stays usable.

**Secret key.** `BACKEND_SECRET_KEY` is validated at application
startup — the app refuses to start (raises immediately, does not run
insecurely) if the key is empty, a known placeholder value (e.g. the
literal text from `.env.example`), or shorter than 32 characters. This
check caught the project's own local dev `.env` still holding the
unedited placeholder when it was added.

**Accepted risks, not yet addressed:**
- No rate limiting or account lockout on login attempts — a determined
  attacker could brute-force a weak password given enough attempts.
  Acceptable for this project's scope and timeline; would need
  addressing before any real production use.
- No password reset flow — an account with a forgotten password
  currently has no self-service recovery path.
- No multi-factor authentication.
- HTTPS/TLS termination is not enforced at the application level —
  relies on the deployment environment (e.g. a reverse proxy or load
  balancer) to provide it. The current Azure VM deployment serves plain
  HTTP directly.

