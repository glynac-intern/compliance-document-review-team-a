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
import time
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, "/app")  # backend/ root, for database.py and models.py imports

from google import genai
from google.genai import types

from database import SessionLocal
from models import Rule
from model_config import EMBEDDING_MODEL, EMBEDDING_DIM

RULES_JSON_PATH = Path("/app/seed/rules/rules.json")

client = genai.Client(api_key=os.environ["LLM_API_KEY"])


def embed_text(text: str, retries: int = 3) -> list[float]:
    """Embeds a single string, with basic retry on transient API errors."""
    for attempt in range(retries):
        try:
            result = client.models.embed_content(
                model=EMBEDDING_MODEL,
                contents=text,
                config=types.EmbedContentConfig(output_dimensionality=EMBEDDING_DIM),
            )
            return result.embeddings[0].values
        except Exception as e:
            if attempt == retries - 1:
                raise
            wait = 2 ** attempt
            print(f"  Embedding call failed ({e}), retrying in {wait}s...")
            time.sleep(wait)


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

        for i, rule_data in enumerate(rules_data, start=1):
            print(f"Embedding {i}/{len(rules_data)}: {rule_data['id']} ({rule_data['type']})")
            embedding = embed_text(rule_data["text"])

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
