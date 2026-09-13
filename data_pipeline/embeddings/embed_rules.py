"""
Embeds the rules/disclosures seed corpus (seed/rules/rules.json) and
UPSERTS each rule into the `rules` table, keyed on rules.json's own
stable "id" field (e.g. "disc-001") -- NOT a fresh random UUID every
run (TA-55).

Re-running this script:
- An existing rule (same seed_id) has its text/type/embedding UPDATED
  IN PLACE, same primary key -- any Flag already pointing at it via
  matched_rule_id keeps resolving correctly.
- A genuinely new rule (new seed_id) gets a new row.
- A rule REMOVED from rules.json is marked is_active=False, never
  deleted -- existing flags still resolve to the exact rule text that
  was in effect when they were generated; retrieval queries simply
  stop offering it as a candidate for new analyses (see
  rule_retrieval.py / analyze_document.py's is_active filters).

Run inside the backend container, where database.py/models.py are on the
path and DATABASE_URL/LLM_API_KEY are set via .env:

    docker compose run --rm backend python data_pipeline/embeddings/embed_rules.py
"""

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, "/app")  # backend/ root, for database.py and models.py imports

from database import SessionLocal
from models import Rule
# Reuse the SAME embedding functions as everywhere else -- not a separate
# copy (TA-34, TA-52, TA-54).
from embed_client import embed_texts_batch

RULES_JSON_PATH = Path("/app/seed/rules/rules.json")
DISCLOSURES_JSON_PATH = Path("/app/seed/disclosures/disclosures.json")


def main():
    if not RULES_JSON_PATH.exists():
        print(f"ERROR: {RULES_JSON_PATH} not found.")
        sys.exit(1)
    if not DISCLOSURES_JSON_PATH.exists():
        print(f"ERROR: {DISCLOSURES_JSON_PATH} not found.")
        sys.exit(1)

    # TA-57: disclosures live in their own dedicated seed file/directory,
    # separate from prohibited_claim/performance_standard rules -- but
    # both are seeded through the SAME path, into the SAME rules table,
    # using the SAME stable-identity upsert logic (TA-55).
    rules_data = json.loads(RULES_JSON_PATH.read_text(encoding="utf-8"))
    disclosures_data = json.loads(DISCLOSURES_JSON_PATH.read_text(encoding="utf-8"))
    print(f"Loaded {len(rules_data)} rules from {RULES_JSON_PATH}")
    print(f"Loaded {len(disclosures_data)} disclosures from {DISCLOSURES_JSON_PATH}")
    rules_data = rules_data + disclosures_data

    db = SessionLocal()
    try:
        print(f"Embedding all {len(rules_data)} rules in one batch call...")
        texts = [r["text"] for r in rules_data]
        embeddings = embed_texts_batch(texts)

        current_seed_ids = set()
        updated_count = 0
        created_count = 0

        for rule_data, embedding in zip(rules_data, embeddings):
            seed_id = rule_data["id"]
            current_seed_ids.add(seed_id)

            existing = db.query(Rule).filter(Rule.seed_id == seed_id).first()
            if existing is not None:
                existing.text = rule_data["text"]
                existing.type = rule_data["type"]
                existing.embedding = embedding
                existing.is_active = True  # a previously-removed rule can come back
                updated_count += 1
            else:
                db.add(Rule(
                    seed_id=seed_id,
                    text=rule_data["text"],
                    type=rule_data["type"],
                    embedding=embedding,
                    is_active=True,
                ))
                created_count += 1

        # Deliberately handle rules removed from rules.json: mark
        # inactive, never delete -- preserves every existing flag's
        # resolvability.
        orphaned = (
            db.query(Rule)
            .filter(Rule.seed_id.isnot(None))
            .filter(~Rule.seed_id.in_(current_seed_ids))
            .filter(Rule.is_active == True)
            .all()
        )
        for rule in orphaned:
            rule.is_active = False

        db.commit()

        final_active_count = db.query(Rule).filter(Rule.is_active == True).count()
        print(f"\nDone. {updated_count} rule(s) updated in place, "
              f"{created_count} new rule(s) created, "
              f"{len(orphaned)} rule(s) marked inactive (removed from corpus).")
        print(f"{final_active_count} active rules total.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
