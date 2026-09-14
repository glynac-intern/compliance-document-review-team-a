# TA-81 rehearsal checklist — clean checkout, outside the team

## Purpose

TA-81's acceptance criteria require someone **outside the team** to clone
the repo and follow the README **with no verbal help**, and for every
point they get stuck to be recorded. This can't be satisfied by anyone
who already knows the codebase — that's the whole point. This checklist
is what to hand them.

## Before you start

- Pick someone who has **not** seen this codebase or gotten verbal
  walkthroughs from the team. A friend, another intern, anyone outside
  Team A.
- Give them **only**: the repo URL/access, and this checklist. No
  Slack DMs answering "quick questions" mid-run — if they need to ask
  something, that's a stuck point, write it down, and answer it
  *after* they've noted where the README left them guessing.
- They'll need: Docker Desktop (WSL2 integration if Windows), and their
  own free-tier Gemini API key from https://aistudio.google.com/app/apikey
  (do not hand them a team key — a fresh key is part of a realistic
  first run).

## What to record

For **each** numbered README step, note:
- Start time / end time
- Anything that wasn't obvious from the text alone
- Any error message hit, verbatim
- Whether they had to guess, search elsewhere, or ask someone

## The run

1. **Clone the repo** (README step 1). Time it. Note: does the person
   have access? (This is the one thing the team can't verify from
   inside — confirm repo visibility/permissions actually work for an
   outside account before starting.)
2. **Env setup** (README step 2). Time it. Specifically check:
   - Is it clear which three values *must* change vs. which can be
     left alone?
   - Did they get their own real Gemini key in before running the
     script, or find out only when seeding failed?
3. **`./scripts/setup.sh`** (README step 3). Time it, including any
   wait for `docker compose up` / image builds (a truly clean machine
   builds from scratch — this is slower than any of the team's own
   runs, all of which reuse cached layers).
   - Does it complete in one run with no manual retry?
   - If it fails, is the error message enough to know what to do next
     without asking someone?
4. **Frontend** (README step 4). Time it. Does `http://localhost:3000`
   load without further steps?
5. **The actual workflow** — this is the part TA-81 explicitly calls
   out and nothing so far has verified:
   - Sign up as an advisor (and separately, as an officer, if the app
     supports choosing a role at signup — check the signup screen).
   - Submit a document as the advisor.
   - Log in as the officer, find it in the review queue, open it.
   - Make a decision (approve / needs revision / reject — whatever the
     UI offers) with a comment.
   - Log back in as the advisor and confirm the decision and comment
     are visible on their side.
   - Note anywhere the UI didn't make the next step obvious.

## After the run

- Total elapsed time, clone to seeing the decision as the advisor.
- The full list of stuck points, in order.
- For each stuck point: was it a missing/wrong README instruction, a
  genuine bug, or something reasonable to expect a newcomer to figure
  out on their own? (Not everything found needs fixing — but everything
  found needs to be *looked at* and a call made.)

## What this session already covered (so you don't need to re-derive it)

A simulated clean-environment rehearsal was run from inside the team
(full Docker teardown — no containers, volumes, or images left before
running) to catch the objective, reproducible breakages up front. Two
real, confirmed bugs were found and fixed as a result:

- Rules seeding and precedent seeding run back-to-back tripped Google's
  free-tier embedding rate limit (100 req/min) on a genuinely clean
  checkout — fixed with a pause between the two steps in
  `scripts/setup.sh`.
- `DATABASE_URL` in `.env.example` carried a separate, hardcoded
  password that could silently desync from `POSTGRES_PASSWORD` the
  moment someone followed the README's "set POSTGRES_PASSWORD to any
  value" instruction — fixed by having `docker-compose.yml` build
  `DATABASE_URL` from the same `POSTGRES_*` vars, so it can't drift.

What a simulated rehearsal **cannot** cover, and this checklist exists
for: whether repo access actually works for an outside account, whether
the *written instructions* read clearly to someone seeing them cold, and
the full signup→submit→review→decide→advisor-sees-decision path through
the actual UI in a browser.
