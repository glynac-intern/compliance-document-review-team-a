"""
Tests for TA-57: the disclosure corpus is expanded to a few dozen
entries, lives in its own dedicated seed location, and is reachable
through the same seeding path as the rest of the rules.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, "/app")


def test_disclosures_json_exists_in_dedicated_directory():
    path = Path("/app/seed/disclosures/disclosures.json")
    assert path.exists(), "seed/disclosures/disclosures.json must exist"


def test_disclosure_corpus_has_a_few_dozen_entries():
    data = json.loads(Path("/app/seed/disclosures/disclosures.json").read_text())
    assert len(data) >= 30, f"expected a few dozen disclosures, found {len(data)}"
    assert all(d["type"] == "disclosure" for d in data)
    assert all("id" in d and "text" in d for d in data)


def test_rules_json_no_longer_contains_disclosure_type():
    """Disclosures were relocated to their own dedicated file -- rules.json
    should hold only prohibited_claim / performance_standard now."""
    data = json.loads(Path("/app/seed/rules/rules.json").read_text())
    types_present = {r["type"] for r in data}
    assert "disclosure" not in types_present


def test_paraphrase_test_cases_reference_real_disclosure_ids():
    disclosures = json.loads(Path("/app/seed/disclosures/disclosures.json").read_text())
    disclosure_ids = {d["id"] for d in disclosures}

    paraphrases = json.loads(Path("/app/seed/disclosures/paraphrase_test_cases.json").read_text())
    assert len(paraphrases) >= 5, "expected a meaningful set of paraphrase test cases"
    for p in paraphrases:
        assert p["disclosure_id"] in disclosure_ids
        assert p["paraphrased_text"] != p["canonical_text"]  # genuinely different wording
