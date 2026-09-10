"""
Tests missing-disclosure-by-absence detection against the 100-document seed
corpus, using PARAGRAPH-LEVEL chunking rather than whole-document embedding.

Rationale: embedding an entire document dilutes the signal from the one
short disclosure paragraph against the rest of the document's unrelated
content (product pitch, client details, etc). Per the brief's own approach
-- "for each section of a document, pull the rules that apply" -- disclosure
presence should be checked per-chunk, taking the closest match across all
chunks, not a single whole-document embedding.

Run inside the backend container:
    docker compose run --rm backend python data_pipeline/retrieval/disclosure_check.py
"""

import json
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, "/app")

from database import SessionLocal
from models import Rule

sys.path.insert(0, "/app/data_pipeline/embeddings")
# Reuse the SAME embedding functions as everywhere else -- not separate
# copies. This is what makes the PII guard (TA-34) apply here too, and
# lets batching (TA-52) apply here as well.
from embed_client import embed_texts_batch

DOCUMENTS_DIR = Path("/app/seed/documents")


def cosine_distance(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(y * y for y in b) ** 0.5
    similarity = dot / (norm_a * norm_b)
    return 1 - similarity


def chunk_paragraphs(text: str) -> list[str]:
    """Splits on blank lines, drops empty/whitespace-only chunks."""
    chunks = re.split(r"\n\s*\n", text)
    return [c.strip() for c in chunks if c.strip()]


def main():
    metadata_path = DOCUMENTS_DIR / "metadata.json"
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    print(f"Loaded metadata for {len(metadata)} documents")

    db = SessionLocal()
    disclosure_rules = db.query(Rule).filter(Rule.type == "disclosure").all()
    disclosure_embeddings = [r.embedding for r in disclosure_rules]
    print(f"Loaded {len(disclosure_rules)} disclosure rules for comparison\n")

    results = []
    total_chunks_embedded = 0
    for i, doc_meta in enumerate(metadata, start=1):
        filename = doc_meta["filename"]
        text = (DOCUMENTS_DIR / filename).read_text(encoding="utf-8")
        chunks = chunk_paragraphs(text)

        chunk_embeddings = embed_texts_batch(chunks)
        total_chunks_embedded += len(chunks)
        print(f"Embedded {i}/{len(metadata)}: {filename} ({len(chunks)} chunks)")

        # Minimum distance across ALL (chunk, rule) pairs -- the single
        # closest match anywhere in the document is what determines presence.
        min_distance = min(
            cosine_distance(chunk_emb, rule_emb)
            for chunk_emb in chunk_embeddings
            for rule_emb in disclosure_embeddings
        )

        ground_truth_missing = "missing_required_disclosure" in doc_meta["injected_issues"]
        results.append({
            "filename": filename,
            "min_distance": min_distance,
            "ground_truth_missing": ground_truth_missing,
        })

    print(f"\nTotal chunks embedded: {total_chunks_embedded}")

    print("\n--- Threshold tuning ---")
    for threshold in [0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35]:
        correct = 0
        for r in results:
            predicted_missing = r["min_distance"] > threshold
            if predicted_missing == r["ground_truth_missing"]:
                correct += 1
        accuracy = correct / len(results) * 100
        print(f"  threshold={threshold:.2f}: {correct}/{len(results)} correct ({accuracy:.1f}%)")

    present_distances = [r["min_distance"] for r in results if not r["ground_truth_missing"]]
    missing_distances = [r["min_distance"] for r in results if r["ground_truth_missing"]]
    print(f"\nDisclosure PRESENT docs ({len(present_distances)}): "
          f"min={min(present_distances):.3f} max={max(present_distances):.3f} "
          f"avg={sum(present_distances)/len(present_distances):.3f}")
    print(f"Disclosure MISSING docs ({len(missing_distances)}): "
          f"min={min(missing_distances):.3f} max={max(missing_distances):.3f} "
          f"avg={sum(missing_distances)/len(missing_distances):.3f}")


if __name__ == "__main__":
    main()
