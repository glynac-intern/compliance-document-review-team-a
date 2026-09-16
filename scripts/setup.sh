#!/usr/bin/env bash
# TA-80: one documented command from a clean checkout to a running,
# seeded app. Wraps the same real, already-proven commands the README
# used to list as seven separate manual steps -- this script IS the
# single source of truth CI and the README both call, not a parallel
# duplicate of their logic.
#
# Idempotent by construction: every step it calls was already built to
# be safe to re-run --
#   - alembic upgrade head naturally no-ops once at head
#   - embed_rules.py upserts by stable seed_id (TA-55), never
#     duplicates rows on a second run
#   - backfill_precedents.py clears and recreates its own seed rows
#     each run (TA-49)
#
# Usage: ./scripts/setup.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

fail() {
    echo -e "${RED}✗ $1${NC}" >&2
    exit 1
}

info() {
    echo -e "${GREEN}▸ $1${NC}"
}

warn() {
    echo -e "${YELLOW}! $1${NC}"
}

# --- Step 1: .env must exist and have real values, not placeholders ---
if [ ! -f .env ]; then
    info "No .env found -- copying from .env.example"
    cp .env.example .env
fi

if grep -q "LLM_API_KEY=your_google_ai_studio_key_here" .env; then
    fail "LLM_API_KEY in .env is still the placeholder. Edit .env with a real Google AI Studio key, then re-run this script."
fi

if grep -q "BACKEND_SECRET_KEY=changeme_generate_a_real_secret" .env; then
    info "BACKEND_SECRET_KEY is still the placeholder -- generating a real one"
    NEW_SECRET=$(openssl rand -hex 32)
    sed -i.bak "s/BACKEND_SECRET_KEY=changeme_generate_a_real_secret/BACKEND_SECRET_KEY=${NEW_SECRET}/" .env
    rm -f .env.bak
fi

# --- Step 2: start the database and backend ---
info "Starting database and backend..."
docker compose up -d db backend

# --- Step 3: wait for the database to be healthy ---
info "Waiting for database to be healthy..."
for i in $(seq 1 30); do
    status=$(docker inspect --format='{{.State.Health.Status}}' compliance_db 2>/dev/null || echo "starting")
    if [ "$status" = "healthy" ]; then
        info "Database is healthy"
        break
    fi
    if [ "$i" -eq 30 ]; then
        fail "Database did not become healthy in time"
    fi
    sleep 2
done

# --- Step 4: run migrations ---
info "Running Alembic migrations..."
# TA-79: -c points at alembic.ini explicitly, repo-root-relative --
# alembic.ini's script_location/prepend_sys_path are %(here)s-relative
# (to the ini file itself), not CWD-relative, so this works regardless
# of the image's default WORKDIR (the repo root -- see backend/Dockerfile).
docker compose run --rm backend alembic -c backend/alembic.ini upgrade head || fail "Migrations failed"

# --- Steps 5-7: seeding + verification, skipped in CI ---
# CI's .env deliberately uses a dummy LLM_API_KEY (real embedding calls
# aren't needed for pytest, which mocks the AI layer) -- so seeding,
# which makes REAL embedding calls, would always fail there. CI sets
# SKIP_SEEDING=1 to use this SAME script for what it genuinely needs
# (env setup, start, migrate) without being forced through steps a
# dummy key can never satisfy. Local/demo use never sets this.
if [ "${SKIP_SEEDING:-0}" = "1" ]; then
    warn "SKIP_SEEDING=1 -- skipping corpus seeding and verification (expected in CI)."
    echo ""
    echo -e "${GREEN}✓ Setup complete (seeding skipped). Backend running at http://localhost:8000${NC}"
    exit 0
fi

# --- Step 5: seed rules + disclosures (one script, TA-57) ---
info "Seeding rules and disclosures..."
docker compose run --rm backend python data_pipeline/embeddings/embed_rules.py || fail "Rule/disclosure seeding failed"

# On a fresh clean checkout, this embeds 54 rules/disclosures in one
# batch call and the next step embeds 100 more right behind it -- both
# against the same Google AI Studio free-tier quota (100 embed_content
# requests/minute). Run back to back with no gap, the precedent step
# reliably trips a 429 RESOURCE_EXHAUSTED, which is exactly the
# friction TA-80 exists to remove for a new team member's first run.
# A short pause lets the per-minute window clear before we spend it
# again.
info "Pausing briefly to stay under the free-tier embedding rate limit..."
sleep 60

# --- Step 6: seed precedents (TA-49/TA-59) ---
info "Seeding precedent index..."
docker compose run --rm backend python data_pipeline/embeddings/backfill_precedents.py || fail "Precedent seeding failed"

# --- Step 7: verify the outcome -- don't just assume it worked ---
info "Verifying seeded data..."

RULE_COUNT=$(docker compose exec -T db psql -U compliance_user -d compliance_db -tAc \
    "SELECT COUNT(*) FROM rules WHERE is_active = true AND type != 'disclosure';")
DISCLOSURE_COUNT=$(docker compose exec -T db psql -U compliance_user -d compliance_db -tAc \
    "SELECT COUNT(*) FROM rules WHERE is_active = true AND type = 'disclosure';")
# Scoped to the seed-corpus advisor account (backfill_precedents.py's
# SEED_ADVISOR_EMAIL), not a bare COUNT(*) over the whole table --
# on a reused volume, precedent_index also holds real entries from
# actual advisor documents reviewed through the app, so an unscoped
# count can look healthy without the seeding step having done anything.
PRECEDENT_COUNT=$(docker compose exec -T db psql -U compliance_user -d compliance_db -tAc \
    "SELECT COUNT(*) FROM precedent_index pi
     JOIN documents d ON d.id = pi.document_id
     JOIN users u ON u.id = d.advisor_id
     WHERE u.email = 'seed-corpus@internal.system';")

echo ""
echo "  Rules (non-disclosure):   ${RULE_COUNT}"
echo "  Disclosures:              ${DISCLOSURE_COUNT}"
echo "  Precedents (seed corpus): ${PRECEDENT_COUNT}"
echo ""

if [ "$RULE_COUNT" -eq 0 ]; then
    fail "Zero active non-disclosure rules -- rule retrieval will silently return nothing. Seeding did not actually work."
fi
if [ "$DISCLOSURE_COUNT" -eq 0 ]; then
    fail "Zero active disclosures -- disclosure-by-absence detection will silently find nothing missing. Seeding did not actually work."
fi
if [ "$PRECEDENT_COUNT" -eq 0 ]; then
    fail "Zero precedent entries -- precedent search will always return an empty state. Seeding did not actually work."
fi

info "All seeded data verified present."
echo ""
echo -e "${GREEN}✓ Setup complete. Backend running at http://localhost:8000${NC}"
