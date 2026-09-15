"""
Runs the full analysis pipeline (mask -> chunk -> retrieve -> flag ->
disclosure-check -> summarize) against one seed document with KNOWN
injected issues, so we can sanity-check output against ground truth
before wiring this into the actual FastAPI endpoint.

Run inside the backend container:
    docker compose run --rm backend python data_pipeline/test_pipeline.py
"""

import json
from pathlib import Path


from database import SessionLocal
from ai.compliance.analyze_document import analyze_text

DOCUMENTS_DIR = Path("/app/seed/documents")


def main():
    metadata = json.loads((DOCUMENTS_DIR / "metadata.json").read_text(encoding="utf-8"))

    # Find a document with BOTH a prohibited claim AND a missing disclosure --
    # the richest possible test case.
    target = next(
        (m for m in metadata
         if "prohibited_claim" in m["injected_issues"]
         and "missing_required_disclosure" in m["injected_issues"]),
        None,
    )
    if target is None:
        print("No document found with both issues -- falling back to first flagged doc.")
        target = next(m for m in metadata if m["injected_issues"])

    filename = target["filename"]
    print(f"Testing against: {filename}")
    print(f"Ground truth injected issues: {target['injected_issues']}\n")

    raw_text = (DOCUMENTS_DIR / filename).read_text(encoding="utf-8")
    print("--- ORIGINAL TEXT ---")
    print(raw_text)
    print()

    db = SessionLocal()
    summary, flags, mapping, chunks_data = analyze_text(db, raw_text)

    print("--- SUMMARY ---")
    print(summary)
    print()

    print(f"--- FLAGS ({len(flags)}) ---")
    for f in flags:
        print(f"[{f['severity']}] rule_id={f['rule_id']}")
        print(f"  passage: {f['passage'][:100]}")
        print(f"  explanation: {f['explanation']}")
        print()


if __name__ == "__main__":
    main()
