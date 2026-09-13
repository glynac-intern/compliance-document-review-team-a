"""
TA-59: Enriches seed/documents/metadata.json with a plausible decision
and officer comment per document, derived deterministically from each
document's own ground-truth issues (never invented data, never real
client data -- these are synthetic seed documents).

Uses a POOL of varied phrasings per issue type (not one fixed template
repeated identically across dozens of documents) -- a real group of
officers wouldn't write identically-worded comments every time, and
genuine text variety is also what makes the precedent EMBEDDINGS
meaningfully distinct from each other, not near-duplicates.

Deterministic: template selection is based on a stable hash of each
document's filename, so re-running this produces the SAME enriched
metadata every time.

Run once (or whenever metadata.json's source issues change):
    python3 data_pipeline/enrich_seed_decisions.py
"""
import hashlib
import json
from pathlib import Path

METADATA_PATH = Path("seed/documents/metadata.json")

APPROVED_COMMENTS = [
    "Compliant. No issues found on review.",
    "Reviewed and approved -- no compliance concerns identified.",
    "Looks good. Cleared for distribution as submitted.",
    "No changes needed. Approved for use with clients.",
    "Passed review without any flagged concerns.",
]

ISSUE_COMMENT_CLAUSES = {
    "prohibited_claim": [
        "contains a prohibited performance claim that needs to be removed",
        "makes a claim that isn't permitted under our marketing guidelines",
        "includes language implying guaranteed or risk-free returns, which must be revised",
    ],
    "performance_standard_violation": [
        "presents performance figures without the required context or disclosures",
        "doesn't meet our performance-reporting standards as written",
        "references returns in a way that needs additional supporting disclosure",
    ],
    "missing_required_disclosure": [
        "is missing one or more required disclosures",
        "needs the standard disclosure language added before it can go out",
        "omits disclosure language that's required for this type of communication",
    ],
}

NEEDS_REVISION_OPENERS = [
    "This document",
    "As written, this",
    "Before this can be approved, it",
]


def _stable_index(key: str, pool_size: int) -> int:
    """Deterministic, filename-based selection -- same result every run,
    regardless of dict/list ordering."""
    digest = hashlib.sha256(key.encode("utf-8")).hexdigest()
    return int(digest, 16) % pool_size


def _build_comment(doc: dict) -> tuple[str, str]:
    if doc["is_clean"]:
        idx = _stable_index(doc["filename"] + "-approved", len(APPROVED_COMMENTS))
        return "approved", APPROVED_COMMENTS[idx]

    clauses = []
    for issue in sorted(doc["injected_issues"]):
        pool = ISSUE_COMMENT_CLAUSES[issue]
        idx = _stable_index(doc["filename"] + "-" + issue, len(pool))
        clauses.append(pool[idx])

    opener_idx = _stable_index(doc["filename"] + "-opener", len(NEEDS_REVISION_OPENERS))
    opener = NEEDS_REVISION_OPENERS[opener_idx]

    if len(clauses) == 1:
        comment = f"{opener} {clauses[0]}."
    else:
        comment = f"{opener} {'; '.join(clauses[:-1])}; and {clauses[-1]}."

    return "needs_revision", comment


def main():
    metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8"))

    decision_counts = {"approved": 0, "needs_revision": 0}
    for doc in metadata:
        decision, comment = _build_comment(doc)
        doc["decision"] = decision
        doc["officer_comment"] = comment
        decision_counts[decision] += 1

    METADATA_PATH.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    print(f"Enriched {len(metadata)} documents with decision + officer_comment.")
    print(f"Decisions: {decision_counts}")

    unique_comments = len(set(d["officer_comment"] for d in metadata))
    print(f"Unique comment strings: {unique_comments} / {len(metadata)} "
          f"(genuine variety, not one template repeated)")


if __name__ == "__main__":
    main()
