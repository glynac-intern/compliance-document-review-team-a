"""
Embeds the rules/disclosures seed corpus (seed/rules/rules.json) and writes
each rule into the `rules` table with its embedding vector, via pgvector.

Run inside the backend container, where database.py/models.py are on the
path and DATABASE_URL/LLM_API_KEY are set via .env:

    docker compose run --rm backend python data_pipeline/embeddings/embed_rules.py

Idempotent: re-running clears and re-embeds all rules, rather than
duplicating rows, so it's safe to run again after editing rules.json.
"""

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, "/app")  # backend/ root, for database.py and models.py imports

from database import SessionLocal
from models import Rule
# Reuse the SAME embedding functions as everywhere else -- not separate
# copies. This is what makes the PII guard (TA-34) apply to the rules
# corpus path too, and lets batching (TA-52) apply here as well.
from embed_client import embed_texts_batch

RULES_JSON_PATH = Path("/app/seed/rules/rules.json")


def main():
    if not RULES_JSON_PATH.exists():
        print(f"ERROR: {RULES_JSON_PATH} not found.")
        sys.exit(1)

    rules_data = json.loads(RULES_JSON_PATH.read_text(encoding="utf-8"))
    print(f"Loaded {len(rules_data)} rules from {RULES_JSON_PATH}")

    db = SessionLocal()
    try:
        existing_count = db.query(Rule).count()
        if existing_count > 0:
            print(f"Clearing {existing_count} existing rule(s) before re-embedding...")
            db.query(Rule).delete()
            db.commit()

        print(f"Embedding all {len(rules_data)} rules in one batch call...")
        texts = [r["text"] for r in rules_data]
        embeddings = embed_texts_batch(texts)

        for rule_data, embedding in zip(rules_data, embeddings):
            rule = Rule(
                text=rule_data["text"],
                type=rule_data["type"],
                embedding=embedding,
            )
            db.add(rule)

        db.commit()
        final_count = db.query(Rule).count()
        print(f"\nDone. {final_count} rules embedded and stored.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
