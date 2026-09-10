"""
Orchestrates the full analysis pipeline for one document's raw extracted
text: mask -> chunk -> per-chunk retrieve+flag -> disclosure-by-absence
check -> summarize -> unmask everything for officer display.

Operates on raw text and a DB session, independent of the Document model,
so it can be tested standalone (see test_pipeline.py) before being wired
into the FastAPI endpoint's persistence layer.
"""

import sys
sys.path.insert(0, "/app/ai/masking")
sys.path.insert(0, "/app/data_pipeline/chunking")
sys.path.insert(0, "/app/data_pipeline/retrieval")
sys.path.insert(0, "/app/data_pipeline/embeddings")
sys.path.insert(0, "/app/ai/summarisation")

from masker import mask_pii, unmask_for_display
from chunker import chunk_paragraphs
from rule_retrieval import retrieve_candidate_rules
from embed_client import embed_text, get_client

from models import Rule
from flagging import generate_flags_for_chunk
from summarizer import generate_summary

DISCLOSURE_ABSENCE_THRESHOLD = 0.20  # validated at 100% accuracy on the seed corpus


def _cosine_distance(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(y * y for y in b) ** 0.5
    return 1 - (dot / (norm_a * norm_b))


def detect_missing_disclosures(chunk_embeddings: list, disclosure_rules: list) -> list[dict]:
    """
    Evaluates EACH disclosure rule independently against every chunk.
    Returns one flag dict per rule whose best (closest) match across all
    chunks still exceeds the threshold -- i.e. genuinely missing.

    Pure function of embeddings + rules, no DB/API calls -- deterministic
    and unit-testable without a live embedding call.
    """
    missing_flags = []
    for rule in disclosure_rules:
        best_distance_for_rule = min(
            _cosine_distance(chunk_emb, rule.embedding) for chunk_emb in chunk_embeddings
        )
        if best_distance_for_rule > DISCLOSURE_ABSENCE_THRESHOLD:
            missing_flags.append({
                "passage": "(No matching disclosure language found anywhere in this document.)",
                "rule_id": str(rule.id),
                "explanation": f"Required disclosure not found: \"{rule.text}\"",
                "severity": "high",
            })
    return missing_flags


def analyze_text(db, raw_text: str) -> tuple[str, list[dict], dict, list[dict]]:
    """
    Returns (summary, flags, mapping, chunks_data).
    flags: list of {"passage": str, "rule_id": str|None, "explanation": str, "severity": str}
    chunks_data: list of {"chunk_index": int, "masked_text": str, "embedding": list[float]}
                 -- persisted by the caller (TA-51) so retrieval jobs can
                 reuse these vectors instead of re-embedding.
    All passage/explanation/summary text is unmasked -- safe to display to
    an officer, but the mapping itself must never leave the server.
    """
    client = get_client()

    masked_text, mapping = mask_pii(raw_text)
    chunks = chunk_paragraphs(masked_text)

    disclosure_rules = db.query(Rule).filter(Rule.type == "disclosure").all()

    all_flags = []
    chunk_embeddings = []
    chunks_data = []

    for i, chunk in enumerate(chunks):
        chunk_emb = embed_text(chunk)
        chunk_embeddings.append(chunk_emb)
        chunks_data.append({
            "chunk_index": i,
            "masked_text": chunk,
            "embedding": chunk_emb,
        })

        candidates = retrieve_candidate_rules(db, chunk_emb)
        chunk_flags = generate_flags_for_chunk(client, chunk, candidates)
        for cf in chunk_flags:
            all_flags.append({
                "passage": chunk,
                "rule_id": cf["rule_id"],
                "explanation": cf["explanation"],
                "severity": cf["severity"],
            })

    # Disclosure-by-absence: each required disclosure is evaluated
    # INDEPENDENTLY (see detect_missing_disclosures) -- a document with one
    # boilerplate disclosure present must still be flagged for every OTHER
    # required disclosure it's missing, not pass clean because of the one
    # close match.
    if disclosure_rules and chunk_embeddings:
        all_flags.extend(detect_missing_disclosures(chunk_embeddings, disclosure_rules))

    summary = generate_summary(client, masked_text)

    # Unmask everything before returning -- officer reads original values.
    for flag in all_flags:
        flag["passage"] = unmask_for_display(flag["passage"], mapping)
        flag["explanation"] = unmask_for_display(flag["explanation"], mapping)
    summary = unmask_for_display(summary, mapping)

    return summary, all_flags, mapping, chunks_data
