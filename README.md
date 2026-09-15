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
   - `LLM_API_KEY` — your Gemini API key from Google AI Studio

   `BACKEND_SECRET_KEY` doesn't need manual editing -- `setup.sh`
   (next step) generates a real one automatically if it's still the
   placeholder.

3. **Run the setup script** (TA-80 -- one command from a clean
   checkout to a running, seeded, verified app; this IS the same
   path CI uses, not a separate duplicate of it):
   ```bash
   ./scripts/setup.sh
   ```
   Starts the database and backend, runs migrations, seeds rules,
   disclosures, and precedents, then verifies the seeded counts
   before reporting success. Safe to re-run at any time -- every
   step it calls is idempotent.

4. **Start the frontend:**
   ```bash
   docker compose up -d frontend
   ```
   Visit `http://localhost:3000`. Sign up as either role (advisor or
   officer) from there -- there's no separate seed step for user
   accounts.

## Troubleshooting

**"LLM_API_KEY in .env is still the placeholder"** -- `setup.sh` checks
for this and refuses to run seeding until it's fixed. Get a free-tier
key from [Google AI Studio](https://aistudio.google.com/app/apikey)
and put it in `.env`.

**Seeding fails partway with a `429 RESOURCE_EXHAUSTED` /
`quotaExceeded` error** -- Google's free tier caps embedding calls at
100 requests/minute. `setup.sh` already pauses between the
rules/disclosures step (54 calls) and the precedents step (100 calls)
to stay under this, but a very slow network or a key that's already
partway through its per-minute quota from something else can still
trip it. Just re-run `./scripts/setup.sh` -- every step is idempotent,
so it picks up cleanly.

**A port is already in use** (`5432`, `8000`, or `3000`) -- something
else on your machine is bound to it. Either stop that process, or
change the host-side port in `docker-compose.yml` (the `"HOST:CONTAINER"`
part of that service's `ports:` entry) and adjust
`NEXT_PUBLIC_API_BASE_URL` / your browser URL to match.

**The app runs but rule retrieval, disclosure detection, or precedent
search come back empty** -- the corpus was never seeded, most likely
because `setup.sh` was skipped in favor of the old manual
`docker compose up` steps, or `SKIP_SEEDING=1` was set outside of CI.
Run `./scripts/setup.sh` and check its final verification counts
(rules, disclosures, precedents) are all non-zero.

**Postgres authentication fails** (`password authentication failed for
user "compliance_user"`) after editing `.env` -- as of this fix,
`DATABASE_URL` is built automatically from `POSTGRES_USER` /
`POSTGRES_PASSWORD` / `POSTGRES_DB`, so this shouldn't happen from
Docker Compose. It can still happen if you're running the backend
outside Docker with a hand-written `DATABASE_URL` that doesn't match
those three values -- keep them in sync.

## Retrieval quality evaluation (TA-60)

Records a baseline measuring whether retrieval finds the right rule,
across all three retrieval jobs (rule lookup, disclosure absence,
precedent relevance), with top-k / chunk size / distance metric /
threshold each varied and compared:

```bash
docker compose run --rm backend python data_pipeline/evaluation/retrieval_quality_harness.py
```

Writes data_pipeline/evaluation/baseline_results.json -- compare
against this after any retrieval tuning to confirm it actually helped.

## Running tests

```bash
docker compose run --rm backend pytest backend/tests/ -v
```

(TA-79: the suite runs the same way outside Docker too -- `pip install
-r backend/requirements.txt` locally, then `pytest` from the repo
root. `pyproject.toml`'s `pythonpath` setting resolves the same
first-party imports either way, without any sys.path hacks in code.)

99 tests (verified by actually running the suite, not just counting
files): the role boundary (advisor/officer access enforcement, tested
in both directions), PII masking (entity detection, documented
limitations, round-trip unmasking, and that masking runs before
anything is embedded or sent to the LLM), documents and revision
threads, upload validation (size cap, content-sniffed file type, not
just the client-supplied one), review decisions and notifications,
precedent indexing/similarity, disclosure detection, and seed-data
integrity. Tests run against a dedicated test database
(`compliance_test_db`), created automatically on first run — separate
from your dev data.

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

## Architecture, for a reader who hasn't seen the blueprint

**The core loop:** an advisor submits a client-facing document → it's
text-extracted, chunked, and PII-masked → the masked text is sent
through retrieval (against a seeded corpus of compliance rules,
required disclosures, and past reviewed documents) and an LLM to
produce a summary and a set of traceable flags, each citing the rule
or missing disclosure that triggered it → an officer works a review
queue, opens the document alongside the AI's summary/flags, and
records a decision (approve / needs revision / reject) with a
comment → the advisor sees the decision and can submit a revision,
which threads onto the same document rather than starting over. Every
state change is audit-logged, and the advisor gets an in-app
notification when a decision lands.

**Where things live**, mapped onto the "Project structure" list above:
- `backend/` owns the state machine (document status, revision
  threads), the role boundary (advisor vs. officer, enforced
  server-side, not just hidden in the UI), and the audit trail.
- `ai/` and `data_pipeline/` together are the AI assist: PII masking
  happens first (`ai/masking`), everything downstream of that —
  chunking, embeddings, retrieval, flag generation, summarization —
  only ever sees masked text.
- `seed/` is the corpus retrieval runs against: compliance rules,
  required disclosures, and a set of past documents indexed as
  precedents (each carrying a real decision + officer comment, not
  invented) so precedent search has something to find on a fresh
  checkout.
- `frontend/` is a Next.js app with real, functioning screens for both
  roles — not just a scaffold: signup/login, an advisor dashboard
  (submit, track status, revise, see decisions and notifications), and
  an officer queue + review screen (filter by status, view the
  original document, see the AI's summary/flags, decide).

**Privacy, specifically:** PII is masked server-side, before any text
reaches retrieval, the LLM vendor, or gets embedded/stored. The
mapping from placeholder back to real value is kept server-side only
and never sent to the LLM vendor or embedded in anything that leaves
the server. See "Notes on the AI setup" below for the model/quota
details, and TA-33 in the tracker for the vendor-payload masking
verification.

## Current status

- **Backend**: auth (JWT, role-based), document submission/revision/audit
  trail, officer review queue and decisions — built and tested.
- **AI pipeline**: PII masking, rule retrieval, disclosure-by-absence
  detection (paragraph-chunked, threshold=0.20, validated at 100% accuracy
  on the seed corpus), flag generation, and summarization — built, wired
  into the API with caching and graceful degradation, and tested.
- **Frontend**: real functioning screens for both roles, not just a
  scaffold — signup/login, an advisor dashboard (submit, track status,
  revise, see decisions and notifications), and an officer queue +
  review screen (filter by status, original document viewer, AI
  summary/flags, decision with comment). Containerized alongside the
  backend.
- **Tests**: 99 tests, covering the role boundary, PII masking,
  documents/revisions, upload validation, review decisions and
  notifications, precedent indexing, disclosure detection, and
  seed-data integrity.

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

