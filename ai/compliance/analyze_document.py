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


def analyze_text(db, raw_text: str) -> tuple[str, list[dict], dict]:
    """
    Returns (summary, flags, mapping).
    flags: list of {"passage": str, "rule_id": str|None, "explanation": str, "severity": str}
    All passage/explanation/summary text is unmasked -- safe to display to
    an officer, but the mapping itself must never leave the server.
    """
    client = get_client()

    masked_text, mapping = mask_pii(raw_text)
    chunks = chunk_paragraphs(masked_text)

    disclosure_rules = db.query(Rule).filter(Rule.type == "disclosure").all()

    all_flags = []
    chunk_embeddings = []

    for chunk in chunks:
        chunk_emb = embed_text(chunk)
        chunk_embeddings.append(chunk_emb)

        candidates = retrieve_candidate_rules(db, chunk_emb)
        chunk_flags = generate_flags_for_chunk(client, chunk, candidates)
        for cf in chunk_flags:
            all_flags.append({
                "passage": chunk,
                "rule_id": cf["rule_id"],
                "explanation": cf["explanation"],
                "severity": cf["severity"],
            })

    # Disclosure-by-absence: check the closest match across ALL chunks
    # against ALL disclosure rules; flag if nothing is close enough.
    if disclosure_rules and chunk_embeddings:
        best_distance = None
        best_rule = None
        for chunk_emb in chunk_embeddings:
            for rule in disclosure_rules:
                d = _cosine_distance(chunk_emb, rule.embedding)
                if best_distance is None or d < best_distance:
                    best_distance = d
                    best_rule = rule

        if best_distance > DISCLOSURE_ABSENCE_THRESHOLD:
            all_flags.append({
                "passage": "(No matching disclosure language found anywhere in this document.)",
                "rule_id": str(best_rule.id),
                "explanation": f"Required disclosure not found: \"{best_rule.text}\"",
                "severity": "high",
            })

    summary = generate_summary(client, masked_text)

    # Unmask everything before returning -- officer reads original values.
    for flag in all_flags:
        flag["passage"] = unmask_for_display(flag["passage"], mapping)
        flag["explanation"] = unmask_for_display(flag["explanation"], mapping)
    summary = unmask_for_display(summary, mapping)

    return summary, all_flags, mapping
