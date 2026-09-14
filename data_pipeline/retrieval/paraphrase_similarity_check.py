"""
TA-57: Proves disclosure-by-absence genuinely detects PARAPHRASED
disclosures, not just exact-text matches -- the whole point of using
semantic embeddings instead of literal string matching.

For each paraphrase test case, embeds the paraphrased text and checks
its cosine distance to the SAME canonical disclosure it's a paraphrase
of. If distance <= the established 0.20 threshold, the paraphrase is
correctly recognized as "present" despite different wording.

Run inside the backend container:
    docker compose run --rm backend python data_pipeline/retrieval/paraphrase_similarity_check.py
"""
import json
from pathlib import Path


from database import SessionLocal
from models import Rule
from data_pipeline.embeddings.embed_client import embed_texts_batch, cosine_distance

PARAPHRASE_CASES_PATH = Path("/app/seed/disclosures/paraphrase_test_cases.json")
THRESHOLD = 0.20  # same threshold validated for disclosure-by-absence


def main():
    cases = json.loads(PARAPHRASE_CASES_PATH.read_text(encoding="utf-8"))
    print(f"Loaded {len(cases)} paraphrase test cases\n")

    db = SessionLocal()

    paraphrased_texts = [c["paraphrased_text"] for c in cases]
    print("Embedding all paraphrased texts in one batch call...")
    paraphrase_embeddings = embed_texts_batch(paraphrased_texts)

    results = []
    for case, paraphrase_emb in zip(cases, paraphrase_embeddings):
        rule = db.query(Rule).filter(Rule.seed_id == case["disclosure_id"]).first()
        if rule is None:
            print(f"WARNING: {case['disclosure_id']} not found in rules table, skipping")
            continue

        distance = cosine_distance(paraphrase_emb, rule.embedding)
        recognized = distance <= THRESHOLD
        results.append({
            "disclosure_id": case["disclosure_id"],
            "distance": distance,
            "recognized_as_present": recognized,
        })
        status = "PASS" if recognized else "FAIL"
        print(f"  [{status}] {case['disclosure_id']}: distance={distance:.4f} "
              f"(threshold={THRESHOLD})")

    passed = sum(1 for r in results if r["recognized_as_present"])
    print(f"\n{'='*60}")
    print(f"{passed}/{len(results)} paraphrases correctly recognized as present.")
    if passed == len(results):
        print("PASS -- semantic similarity detection genuinely works on")
        print("paraphrased text, not just exact string matches.")
    else:
        print("Some paraphrases were NOT recognized -- see failures above.")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
