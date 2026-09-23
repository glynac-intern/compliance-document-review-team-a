# Compliance Document Review App

Glynac Capture the Flag intern challenge — Team A.

An internal tool for financial advisors to submit client-facing documents
for compliance review, with an AI assist (summary, flags, PII masking,
disclosure-by-absence detection) to help officers review faster and more
consistently.

## Demo

- **Live app**: https://104-211-102-169.sslip.io/login
- **Overview slides**: [Verity Overview (Google Slides)](https://docs.google.com/presentation/d/18AXqb-hxlS47rzBCkRFJdvCVM1ayCLei/edit?usp=sharing&ouid=105756314249134073234&rtpof=true&sd=true)
- **Demo video**: _recording later today — link to be added_

## Team

Team A — Glynac Capture the Flag intern challenge.

- **HY Carolyne Tso** — backend, AI/data pipeline, DevOps (CI, dependency
  scanning, pre-commit hooks, deployment), and testing.
- **Natnael Gebrie** — frontend.
- Puneet Raghav, Prachi Pingale — listed on the team roster; no commits
  or contributions recorded in this repo's git history.

## Prerequisites

- Docker Desktop (with WSL2 integration if on Windows)
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
  (free tier is sufficient for development)

## Setup

1. **Clone the repo:**
   ```bash
   git clone https://github.com/glynac-intern/compliance-document-review-team-a.git
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
   *Note: Ensure Step 3 (`./scripts/setup.sh`) has completed first so the database and backend are running and seeded.*

   - **Build-time env var note:** The frontend runs a production build (`next build` + `next start`). `NEXT_PUBLIC_API_BASE_URL` is passed as a build argument in `docker-compose.yml` and inlined into client JavaScript at image build time (defaults to `http://localhost:8000` from `.env`). If hosting on a remote VM, domain, or custom port, set `NEXT_PUBLIC_API_BASE_URL` in `.env` and **rebuild** the image:
     ```bash
     docker compose build frontend && docker compose up -d frontend
     ```
   - **Alternative (running locally outside Docker for dev):**
     ```bash
     cd frontend && npm install && npm run dev
     ```
     (In development mode, `api-client.ts` automatically defaults to `http://localhost:8000` if `NEXT_PUBLIC_API_BASE_URL` is not set).

   - **User Accounts & Demo Workflow:**
     Visit `http://localhost:3000`. User accounts are not seeded automatically. Click **Sign Up** (`/signup`) where you can choose between **Financial Advisor** and **Compliance Officer** via the interactive role selector. Accounts persist in Postgres once created.
     *Tip for live testing/demos:* Open one standard browser window (Advisor) and one Incognito/Private window (Officer) side-by-side to showcase the full submit → AI analysis → review → decision lifecycle in real time without logging in and out.

## Try it out

The steps above get the app running; this walks through the actual
core loop once, end to end, on top of that.

1. **Sign up twice** -- once as `Financial Advisor`, once as
   `Compliance Officer` (two different emails; the role picker is on
   the sign-up screen only -- login is just email/password and routes
   by role automatically). Use a real-shaped email domain -- `.test` /
   `.example` are RFC-reserved and will be rejected by the signup
   validator.
2. **As the advisor:** go to New Submission, upload a PDF/DOCX/XLSX
   (anything under 10MB works, including the sample files in
   `seed/documents/converted/`), fill in the required fields, submit.
3. **As the officer:** open Review Queue, find the document, open it.
   The AI Assist panel runs on first open (a real Gemini call --
   expect a few seconds) and shows a summary, a set of flags (each
   citing the passage, the rule, and why), and the 3 most similar past
   precedents. Enter a comment and record a decision.
4. **Back as the advisor:** the document's status has updated and
   there's an in-app notification -- no page reload needed to see it.
   If the decision was "Needs Revision," a **Revise & Resubmit**
   button appears; using it uploads a new version linked to the same
   document (tracked revision history), not a separate submission.

## Demo tips

- **Start from a fresh upload, not the queue's mock rows.** If a row
  with an ID like `DOC-2026-0872` is visible, it's frontend
  placeholder data, not a real backend UUID -- opening it shows a
  degraded "AI analysis unavailable" state. Submit a real document as
  the advisor first, then review that one as the officer.
- **Prefer PDF for the walkthrough.** It renders natively in the
  browser iframe, giving the highest-fidelity preview. DOCX/XLSX work
  too (via client-side parsers), but PDF looks best live.
- **Pace AI Assist queries.** The Gemini free tier caps at 15
  requests/minute (100 req/min overall) -- avoid rapid-fire chat
  questions back to back in the AI Assist panel.
- **Decisions are final once submitted.** Approve/Reject/Needs
  Revision can't be undone without a new revision upload -- walk
  through comments and the AI Assist panel first, and submit the
  decision last.

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

**Frontend loads, but API calls fail or show network errors** --
`NEXT_PUBLIC_API_BASE_URL` is inlined into the client bundle at `next build` time, not dynamically at container start. If running on a remote VM, domain, or custom port, ensure `NEXT_PUBLIC_API_BASE_URL` in `.env` points to that address and explicitly rebuild: `docker compose build frontend && docker compose up -d frontend`. Also confirm `./scripts/setup.sh` finished so `compliance_backend` is running and healthy on port 8000.

## Git hooks (TA-128)

`./scripts/setup.sh` installs and activates these automatically. To set
up by hand instead:

```bash
pip install pre-commit
pre-commit install --install-hooks
```

Two stages, kept deliberately separate:

- **pre-commit** (every commit, a few seconds): ruff lint + format,
  trailing-whitespace/EOF/large-file/merge-conflict/YAML/TOML hygiene,
  `detect-secrets`, and the frontend's `npm run lint` / `npm run
  type-check` when a `frontend/` file is staged. Same tools and same
  config files CI uses (`pyproject.toml`'s `[tool.ruff]`,
  `frontend/eslint.config.*`, `frontend/tsconfig.json`) -- not a second,
  separately-drifting rule set.
- **pre-push** (before a push, slower): `pytest -m unit` -- the fast,
  DB/Docker-free subset (see "Running tests" below).

Skipping hooks locally (`git commit --no-verify`) doesn't skip
enforcement -- CI runs the identical pre-commit hook set as its own
`pre-commit` job.

`.secrets.baseline` records findings already triaged as false positives
(alembic revision hex IDs, docker-compose's test-only DB creds in
`tests.yml`). `backend/tests/` is excluded from the secrets scan
entirely -- see the comment in `.pre-commit-config.yaml`.

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

### Backend tests

```bash
# Run unit tests (fast, no DB or Docker needed)
pytest -m unit -v

# Run integration tests (or full suite via Docker)
docker compose run --rm backend pytest -m integration -v
docker compose run --rm backend pytest backend/tests/ -v
```

(TA-79: the suite runs the same way outside Docker too -- `pip install
-r backend/requirements.txt` locally, then `pytest` from the repo
root. `pyproject.toml`'s `pythonpath` setting resolves the same
first-party imports either way, without any sys.path hacks in code.)

### Frontend unit tests (TA-122)

```bash
cd frontend && npm test
```

### End-to-end browser tests (TA-130)

Browser tests use Playwright with pre-authenticated sessions (`storageState`) and automatic test data isolation:

```bash
# Start the application stack
./scripts/setup.sh
docker compose up -d frontend

# Run the Playwright test suite
npx playwright test

# Interactive UI runner
npx playwright test --ui

# View HTML diagnostic reports and traces
npx playwright show-report
```

See [tests/e2e/README.md](tests/e2e/README.md) for testing conventions, locators, and auth fixtures.


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

(The original planning document is included at
[`docs/software-blueprint-v0.2.docx`](docs/software-blueprint-v0.2.docx)
— this section describes the system as actually built, which is what
matters if the two ever disagree.)

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

## Definition of Done (Blueprint §21)

The Software Blueprint v0.2's own acceptance criteria, checked item by
item -- via a live click-through of the running app (not just a code
read) where marked "live," or a direct code/test read where marked
"code":

| # | Criterion | Status |
|---|---|---|
| 1 | Advisor can sign up | ✅ live |
| 2 | Officer can sign up | ✅ live |
| 3 | Advisor can upload PDF/DOCX/XLSX | ✅ live (PDF) |
| 4 | Officer sees submission in filterable queue | ✅ live |
| 5 | Officer can open document | ✅ live |
| 6 | AI summary is displayed when available | ✅ live -- real Gemini call, not a stub |
| 7 | AI flags are displayed | ✅ live -- 37 flags on a real synthetic test document |
| 8 | Each flag contains passage + rule + explanation | ✅ live -- confirmed on every flag, not just the first |
| 9 | Officer can approve/reject/request revision | ✅ live (Needs Revision path); Approve/Reject buttons present, same code path |
| 10 | Advisor sees decision and comment | ✅ live -- status + comment + in-app notification, no reload needed |
| 11 | Revision remains linked to original | ✅ live + DB-verified -- `thread_id`/`replaces_document_id` checked directly in Postgres, not just the UI |
| 12 | Audit history records actors/actions/timestamps | ✅ live -- 4 real timestamped events (submitted/viewed/decided/viewed) |
| 13 | Both role boundaries enforced at API level | ✅ code -- `require_role()` FastAPI dependency, 403 on mismatch, not UI-hidden (`backend/auth/dependencies.py`) |
| 14 | PII masked before LLM calls | ✅ code -- `mask_pii()` runs before any `generate_content` call (`ai/compliance/analyze_document.py`) |
| 15 | PII masked before embedding calls | ✅ code, exceeds the bar -- `embed_client.py` actively refuses to embed any text the masker would still flag, as a fail-safe against a masking bug upstream |
| 16 | Three relevant precedents can be retrieved | ✅ live -- "Similar Precedents (3)" on a real query, exact count |
| 17 | AI failure does not block review | ✅ code -- `submit_decision` has no dependency on `AIAnalysis.status`; a failed/never-run analysis still allows a decision |
| 18 | Tests pass | ✅ 99 tests, see "Current status" above |
| 19 | Clean checkout works | ⚠️ verified internally (see TA-80/TA-126 setup runs); genuine outside-the-team rehearsal is TA-81, still open |
| 20 | README provides reproducible setup | ⚠️ same caveat as #19 -- a real blocker (wrong clone URL) was found and fixed today by re-reading the README as an outsider would, which is exactly why #19/#20 still need a genuine outside rehearsal rather than another internal read |

18 of 20 fully confirmed. The remaining 2 aren't failures -- they're the one requirement that structurally can't be verified from inside the team, which is what TA-81 exists for.

## Known limitations

Found via an end-to-end click-through of the live app (not just a code
read), on top of the automated test suite above. Neither of these
affects a rubric hard-constraint -- role boundary, PII masking,
traceable flags, and graceful degradation are all confirmed working --
they're both display/UX gaps:

- **Document Title, Category, Target Audience, and Notes (the New
  Submission form's metadata fields) aren't persisted server-side.**
  The `documents` table only stores `file_reference`, `type`
  (pdf/docx/xlsx), and `original_filename` -- nothing else the form
  collects survives the request. In practice this means the
  submissions table always displays the first Category dropdown option
  ("Presentation / Deck") regardless of what was actually selected.
  Cosmetic, not a data-loss risk to anything the app actually acts on.
- **No PII-masking toggle on the officer review screen.** The
  server-side masking requirement itself -- unmasked text never reaches
  the LLM vendor or gets embedded -- is independently verified and
  unaffected; this is only about whether an officer can *preview* the
  masked version of a document from the UI. Not built yet. It's an
  automatic server-side invariant, not meant to be optional -- there's
  no toggle to add, on the UI or otherwise. To prove masking is
  happening, run:
  ```bash
  docker compose run --rm backend python data_pipeline/prove_masking_demo.py
  ```
  This runs a real document through the actual pipeline and writes
  `/app/masking_proof.json`, showing the outbound LLM/embedding
  payloads only ever contained masked tokens (e.g. `[CLIENT_1]`),
  never the real PII.

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
