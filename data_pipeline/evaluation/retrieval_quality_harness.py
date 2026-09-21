"""
TA-60: Retrieval-quality evaluation harness, covering all three
retrieval jobs this app depends on:

  1. Rule lookup       -- given a chunk with a known issue category,
                          does a candidate of that category appear in
                          the top-k retrieved rules? Also compares
                          chunking strategy (paragraph vs whole-document)
                          and distance metric (cosine vs L2 vs dot
                          product).
  2. Disclosure absence -- at a given distance threshold, does the
                          present/missing prediction match ground truth?
  3. Precedent relevance -- do the top-3 retrieved precedents agree on
                          decision with the query document's own
                          decision?

Ground-truth honesty note: seed/documents/metadata.json labels each
document's injected issue by CATEGORY (e.g. "prohibited_claim"), not
by which specific rule id was injected. So "the correct rule is
retrieved" is measured as "a candidate of the correct CATEGORY appears
in the top-k" -- an honest proxy given the data's actual granularity,
not exact rule-id matching, which this corpus was never built to
support.

Cost-awareness (given repeated free-tier rate limits hit tonight):
- Precedent relevance reuses the ALREADY-STORED embeddings from the
  precedent_index backfill (TA-59) -- ZERO new embedding API calls,
  runs at full 100-document scale.
- Rule lookup and disclosure absence need FRESH per-chunk embeddings,
  so they run against a representative SAMPLE (not the full 100), and
  batch ALL chunks across the whole sample into as FEW requests as
  possible (not one request per document) -- minimizing request COUNT
  is what matters for the free tier's per-minute ceiling, not total
  text volume.
- Distance-metric comparison reuses embeddings already fetched for
  rule lookup -- zero additional API calls, just alternate math.
- Chunk-size comparison needs ONE additional embedding call for the
  whole-document variant (one batch call for all sampled docs, not
  one per doc) -- a modest, bounded additional cost.
- Reuses the exact same helpers everywhere else in this codebase uses
  (embed_client.py, chunker.py, masker.py, rule_retrieval.py,
  precedent_retrieval.py) -- no duplicate re-implementation of the
  actual algorithms, only a thin evaluation-orchestration loop on top.

Run inside the backend container:
    docker compose run --rm backend python data_pipeline/evaluation/retrieval_quality_harness.py
"""
import json
from pathlib import Path


from ai.masking.masker import mask_pii
from data_pipeline.chunking.chunker import chunk_paragraphs
from data_pipeline.embeddings.embed_client import embed_texts_batch, cosine_distance
from data_pipeline.retrieval.rule_retrieval import retrieve_candidate_rules
from data_pipeline.retrieval.precedent_retrieval import retrieve_similar_precedents

from database import SessionLocal
from models import Rule, PrecedentIndex

SEED_DOCUMENTS_DIR = Path("/app/seed/documents")
SAMPLE_SIZE = 15  # honest sample, kept small enough that its total chunk
# count stays safely under the embedding API's own 100-item-per-batch cap
# (20 documents produced 104 chunks and hit that ceiling directly)


def l2_distance(a: list[float], b: list[float]) -> float:
    return sum((x - y) ** 2 for x, y in zip(a, b)) ** 0.5


def dot_product_distance(a: list[float], b: list[float]) -> float:
    # Framed as a "distance" (lower = more similar) by negating, so it
    # sorts the same direction as the other two metrics.
    return -sum(x * y for x, y in zip(a, b))


DISTANCE_METRICS = {
    "cosine": cosine_distance,
    "l2": l2_distance,
    "dot_product": dot_product_distance,
}


def _batch_embed_all_chunks(sample: list[dict]) -> tuple[list[list[list[float]]], list[list[float]]]:
    """
    Masks + chunks every sampled document, then embeds EVERYTHING (all
    chunks across all documents, plus one whole-document embedding per
    document) in just TWO batch calls total -- not one call per
    document. Returns (per_doc_chunk_embeddings, whole_doc_embeddings).
    """
    masked_texts = []
    for doc_meta in sample:
        raw_text = (SEED_DOCUMENTS_DIR / doc_meta["filename"]).read_text(encoding="utf-8")
        masked_text, _ = mask_pii(raw_text)
        masked_texts.append(masked_text)

    chunks_per_doc = [chunk_paragraphs(t) for t in masked_texts]
    flat_chunks = [c for chunks in chunks_per_doc for c in chunks]

    print(f"  Embedding {len(flat_chunks)} chunks across {len(sample)} documents in ONE batch call...")
    flat_chunk_embeddings = embed_texts_batch(flat_chunks)

    per_doc_chunk_embeddings = []
    idx = 0
    for chunks in chunks_per_doc:
        n = len(chunks)
        per_doc_chunk_embeddings.append(flat_chunk_embeddings[idx:idx + n])
        idx += n

    print(f"  Embedding {len(sample)} whole-document variants in ONE more batch call...")
    whole_doc_embeddings = embed_texts_batch(masked_texts)

    return per_doc_chunk_embeddings, whole_doc_embeddings


# --- 1. Rule lookup ---------------------------------------------------

def evaluate_rule_lookup(db, sample: list[dict], per_doc_chunk_embeddings: list, top_k_values: list[int]) -> dict:
    print(f"\nRule lookup: evaluating {len(sample)} documents")

    top_k_results = {}
    for top_k in top_k_values:
        hits = 0
        for doc_meta, chunk_embeddings in zip(sample, per_doc_chunk_embeddings):
            relevant_types = {i for i in doc_meta["injected_issues"]
                               if i in ("prohibited_claim", "performance_standard_violation")}
            found = False
            for chunk_emb in chunk_embeddings:
                candidates = retrieve_candidate_rules(db, chunk_emb, top_k=top_k)
                if any(c.type in relevant_types for c in candidates):
                    found = True
                    break
            if found:
                hits += 1
        accuracy = hits / len(sample) if sample else 0
        top_k_results[top_k] = accuracy
        print(f"  [top_k sweep] top_k={top_k}: {hits}/{len(sample)} correct ({accuracy*100:.1f}%)")

    return top_k_results


def evaluate_chunk_size_comparison(db, sample: list[dict], per_doc_chunk_embeddings: list,
                                    whole_doc_embeddings: list) -> dict:
    rules = db.query(Rule).filter(Rule.type.in_(("prohibited_claim", "performance_standard")),
                                   Rule.is_active).all()

    def _accuracy(embeddings_per_doc, top_k=3):
        hits = 0
        for doc_meta, doc_embs in zip(sample, embeddings_per_doc):
            relevant_types = {i for i in doc_meta["injected_issues"]
                               if i in ("prohibited_claim", "performance_standard_violation")}
            # doc_embs is either a list-of-chunk-embeddings or a single
            # whole-doc embedding -- normalize to a list either way.
            embs = doc_embs if isinstance(doc_embs[0], list) else [doc_embs]
            found = False
            for emb in embs:
                ranked = sorted(rules, key=lambda r: cosine_distance(emb, r.embedding))[:top_k]
                if any(r.type in relevant_types for r in ranked):
                    found = True
                    break
            if found:
                hits += 1
        return hits / len(sample) if sample else 0

    paragraph_accuracy = _accuracy(per_doc_chunk_embeddings)
    whole_doc_accuracy = _accuracy(whole_doc_embeddings)

    print(f"\nChunk-size comparison (top_k=3): paragraph-level={paragraph_accuracy*100:.1f}%, "
          f"whole-document={whole_doc_accuracy*100:.1f}%")

    return {"paragraph_level": paragraph_accuracy, "whole_document": whole_doc_accuracy}


def evaluate_distance_metric_comparison(db, sample: list[dict], per_doc_chunk_embeddings: list) -> dict:
    rules = db.query(Rule).filter(Rule.type.in_(("prohibited_claim", "performance_standard")),
                                   Rule.is_active).all()

    results = {}
    for metric_name, metric_fn in DISTANCE_METRICS.items():
        hits = 0
        for doc_meta, chunk_embeddings in zip(sample, per_doc_chunk_embeddings):
            relevant_types = {i for i in doc_meta["injected_issues"]
                               if i in ("prohibited_claim", "performance_standard_violation")}
            found = False
            for chunk_emb in chunk_embeddings:
                ranked = sorted(rules, key=lambda r: metric_fn(chunk_emb, r.embedding))[:3]
                if any(r.type in relevant_types for r in ranked):
                    found = True
                    break
            if found:
                hits += 1
        accuracy = hits / len(sample) if sample else 0
        results[metric_name] = accuracy
        print(f"  [distance-metric comparison, top_k=3] {metric_name}: {accuracy*100:.1f}%")

    return results


# --- 2. Disclosure absence --------------------------------------------

def evaluate_disclosure_absence(db, sample: list[dict], per_doc_chunk_embeddings: list,
                                 thresholds: list[float]) -> dict:
    print(f"\nDisclosure absence: evaluating {len(sample)} documents")

    disclosure_rules = db.query(Rule).filter(Rule.type == "disclosure", Rule.is_active).all()
    disclosure_embeddings = [r.embedding for r in disclosure_rules]

    doc_results = []
    for doc_meta, chunk_embeddings in zip(sample, per_doc_chunk_embeddings):
        min_distance = min(
            cosine_distance(chunk_emb, rule_emb)
            for chunk_emb in chunk_embeddings
            for rule_emb in disclosure_embeddings
        )
        ground_truth_missing = "missing_required_disclosure" in doc_meta["injected_issues"]
        doc_results.append({"min_distance": min_distance, "ground_truth_missing": ground_truth_missing})

    results = {}
    for threshold in thresholds:
        correct = sum(
            1 for r in doc_results
            if (r["min_distance"] > threshold) == r["ground_truth_missing"]
        )
        accuracy = correct / len(doc_results) if doc_results else 0
        results[threshold] = accuracy
        print(f"  threshold={threshold:.2f}: {correct}/{len(doc_results)} correct ({accuracy*100:.1f}%)")

    return results


# --- 3. Precedent relevance --------------------------------------------

def evaluate_precedent_relevance(db, top_k: int = 3) -> dict:
    """Zero new API calls -- reuses embeddings already stored in
    precedent_index (TA-59's backfill). Full 100-document scale."""
    all_precedents = db.query(PrecedentIndex).all()
    print(f"\nPrecedent relevance: evaluating {len(all_precedents)} precedent entries "
          f"(zero new API calls -- reuses stored embeddings)")

    agree_majority = 0
    for query in all_precedents:
        candidates = retrieve_similar_precedents(
            db, query.embedding, exclude_document_ids=[query.document_id], top_k=top_k
        )
        if not candidates:
            continue
        agreements = sum(1 for c in candidates if c.decision == query.decision)
        if agreements >= (len(candidates) / 2):
            agree_majority += 1

    accuracy = agree_majority / len(all_precedents) if all_precedents else 0
    print(f"  {agree_majority}/{len(all_precedents)} queries had majority-agreeing "
          f"precedents ({accuracy*100:.1f}%)")

    return {"majority_agreement_rate": accuracy}


def main():
    db = SessionLocal()

    print("=" * 70)
    print("RETRIEVAL QUALITY EVALUATION HARNESS -- baseline run")
    print("=" * 70)

    metadata = json.loads((SEED_DOCUMENTS_DIR / "metadata.json").read_text())
    rule_related = [
        d for d in metadata
        if any(issue in ("prohibited_claim", "performance_standard_violation") for issue in d["injected_issues"])
    ]
    sample = rule_related[:SAMPLE_SIZE]
    print(f"\nUsing a shared sample of {len(sample)} documents "
          f"(from {len(rule_related)} with rule-relevant issues) for rule lookup, "
          f"chunk-size, distance-metric, and disclosure-absence evaluations.\n")

    per_doc_chunk_embeddings, whole_doc_embeddings = _batch_embed_all_chunks(sample)

    rule_lookup_results = evaluate_rule_lookup(db, sample, per_doc_chunk_embeddings, top_k_values=[1, 3, 5])
    chunk_size_results = evaluate_chunk_size_comparison(db, sample, per_doc_chunk_embeddings, whole_doc_embeddings)
    distance_metric_results = evaluate_distance_metric_comparison(db, sample, per_doc_chunk_embeddings)
    disclosure_results = evaluate_disclosure_absence(db, sample, per_doc_chunk_embeddings,
                                                       thresholds=[0.10, 0.15, 0.20, 0.25, 0.30])
    precedent_results = evaluate_precedent_relevance(db, top_k=3)

    baseline = {
        "rule_lookup_accuracy_by_top_k": rule_lookup_results,
        "chunk_size_comparison_top_k3": chunk_size_results,
        "distance_metric_comparison_top_k3": distance_metric_results,
        "disclosure_absence_accuracy_by_threshold": disclosure_results,
        "precedent_majority_agreement_rate": precedent_results["majority_agreement_rate"],
        "notes": {
            "sample_size": SAMPLE_SIZE,
            "sample_criterion": "documents with prohibited_claim or performance_standard_violation issues",
            "ground_truth_granularity": "category-level (prohibited_claim/performance_standard/disclosure), "
                                         "not specific rule id -- corpus was not built to support finer matching",
            "precedent_evaluation_scale": "full 100-document corpus (zero new API cost, reuses stored embeddings)",
        },
    }

    output_path = Path("/app/data_pipeline/evaluation/baseline_results.json")
    output_path.write_text(json.dumps(baseline, indent=2), encoding="utf-8")

    print("\n" + "=" * 70)
    print(f"Baseline recorded to {output_path}")
    print("=" * 70)


if __name__ == "__main__":
    main()
