"""
Tests missing-disclosure-by-absence detection against the 100-document seed
corpus, using PARAGRAPH-LEVEL chunking rather than whole-document embedding.

Rationale: embedding an entire document dilutes the signal from the one
short disclosure paragraph against the rest of the document's unrelated
content (product pitch, client details, etc). Per the brief's own approach
-- "for each section of a document, pull the rules that apply" -- disclosure
presence should be checked per-chunk, taking the closest match across all
chunks, not a single whole-document embedding.

TA-54: chunk_paragraphs and cosine_distance are imported from their real
shared locations (chunker.py, embed_client.py) rather than redefined here
-- this script now genuinely shares its chunking and embedding code path
with production, so its threshold numbers mean something. The distance
computation itself stays a Python loop (not a pgvector query) since this
script's whole job is comparing many candidate thresholds against raw
distance values, which pgvector's ORDER BY/LIMIT pattern isn't built for
-- that's a deliberate difference in what this script needs to do, not
leftover duplication.

Run inside the backend container:
    docker compose run --rm backend python data_pipeline/retrieval/disclosure_check.py
"""

import json
import time
from pathlib import Path


from database import SessionLocal
from models import Rule

# Reuse the SAME chunking, embedding, and distance code as production --
# not separate copies (TA-54). This is also what makes the PII guard
# (TA-34) and batching (TA-52) apply here.
from data_pipeline.embeddings.embed_client import embed_texts_batch, cosine_distance
from data_pipeline.chunking.chunker import chunk_paragraphs

from ai.masking.masker import mask_pii

DOCUMENTS_DIR = Path("/app/seed/documents")


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
        raw_text = (DOCUMENTS_DIR / filename).read_text(encoding="utf-8")
        # Mask BEFORE chunking, matching production's exact order
        # (analyze_text: mask_pii then chunk_paragraphs) -- this also
        # closes a real gap: this script previously sent RAW, unmasked
        # text to the embedding API, undetected until TA-34's guard
        # correctly caught it on this ticket's first genuine full run.
        masked_text, _mapping = mask_pii(raw_text)
        chunks = chunk_paragraphs(masked_text)

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
        results.append(
            {
                "filename": filename,
                "min_distance": min_distance,
                "ground_truth_missing": ground_truth_missing,
            }
        )

        # Pace requests to stay comfortably under the free tier's
        # 100 embed-requests-per-minute ceiling -- 100 documents means
        # 100 calls, right at that limit if run back to back.
        time.sleep(0.7)

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
    print(
        f"\nDisclosure PRESENT docs ({len(present_distances)}): "
        f"min={min(present_distances):.3f} max={max(present_distances):.3f} "
        f"avg={sum(present_distances)/len(present_distances):.3f}"
    )
    print(
        f"Disclosure MISSING docs ({len(missing_distances)}): "
        f"min={min(missing_distances):.3f} max={max(missing_distances):.3f} "
        f"avg={sum(missing_distances)/len(missing_distances):.3f}"
    )


if __name__ == "__main__":
    main()
