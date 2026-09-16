"""
Orchestrates the full analysis pipeline for one document's raw extracted
text: mask -> chunk -> per-chunk retrieve+flag -> disclosure-by-absence
check -> summarize -> unmask everything for officer display.

Operates on raw text and a DB session, independent of the Document model,
so it can be tested standalone (see test_pipeline.py) before being wired
into the FastAPI endpoint's persistence layer.
"""
from ai.masking.masker import mask_pii, unmask_for_display
from data_pipeline.chunking.chunker import chunk_paragraphs
from data_pipeline.retrieval.rule_retrieval import retrieve_candidate_rules
from data_pipeline.embeddings.embed_client import embed_texts_batch, get_client

from models import Rule
from ai.compliance.flagging import generate_flags_for_chunk
from ai.summarisation.summarizer import generate_summary

DISCLOSURE_ABSENCE_THRESHOLD = 0.20  # validated at 100% accuracy on the seed corpus


def detect_missing_disclosures(db, chunk_embeddings: list, disclosure_rules: list) -> list[dict]:
    """
    Evaluates EACH disclosure rule independently against every chunk.
    Returns one flag dict per rule whose best (closest) match across all
    chunks still exceeds the threshold -- i.e. genuinely missing.

    Distance is computed IN PGVECTOR (TA-52), matching the same approach
    rule_retrieval.py already uses for rule retrieval -- not a manual
    Python float loop. For each chunk, one query asks pgvector for the
    distance to every disclosure rule at once; Python only tracks the
    running minimum per rule across the (small number of) chunks.
    """
    if not disclosure_rules or not chunk_embeddings:
        return []

    rule_ids = [r.id for r in disclosure_rules]
    rules_by_id = {r.id: r for r in disclosure_rules}
    min_distance_per_rule = {}

    for chunk_emb in chunk_embeddings:
        results = (
            db.query(Rule.id, Rule.embedding.cosine_distance(chunk_emb).label("distance"))
            .filter(Rule.id.in_(rule_ids))
            .all()
        )
        for rule_id, distance in results:
            if rule_id not in min_distance_per_rule or distance < min_distance_per_rule[rule_id]:
                min_distance_per_rule[rule_id] = distance

    missing_flags = []
    for rule_id, distance in min_distance_per_rule.items():
        if distance > DISCLOSURE_ABSENCE_THRESHOLD:
            rule = rules_by_id[rule_id]
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

    disclosure_rules = db.query(Rule).filter(Rule.type == "disclosure", Rule.is_active == True).all()

    # Batch ALL chunk embeddings in ONE API call (TA-52), instead of one
    # network round trip per chunk.
    chunk_embeddings = embed_texts_batch(chunks) if chunks else []
    chunks_data = [
        {"chunk_index": i, "masked_text": chunk, "embedding": emb}
        for i, (chunk, emb) in enumerate(zip(chunks, chunk_embeddings))
    ]

    all_flags = []
    for chunk, chunk_emb in zip(chunks, chunk_embeddings):
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
        all_flags.extend(detect_missing_disclosures(db, chunk_embeddings, disclosure_rules))

    summary = generate_summary(client, masked_text)

    # Unmask everything before returning -- officer reads original values.
    for flag in all_flags:
        flag["passage"] = unmask_for_display(flag["passage"], mapping)
        flag["explanation"] = unmask_for_display(flag["explanation"], mapping)
    summary = unmask_for_display(summary, mapping)

    return summary, all_flags, mapping, chunks_data
