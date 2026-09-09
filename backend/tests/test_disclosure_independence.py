"""
Regression test for TA-48: disclosure-by-absence must evaluate each
required disclosure INDEPENDENTLY. The bug: a single global minimum
distance across all (chunk, rule) pairs meant one present disclosure
could mask every other missing one.

Uses small synthetic vectors, not real embeddings -- detect_missing_disclosures
is a pure function of (chunk_embeddings, disclosure_rules), so this is fast,
deterministic, and needs no live API call. Cosine distance is 0 for identical
vectors and 1 for orthogonal vectors, which is all we need to construct a
controlled present/absent scenario.
"""
import sys
from dataclasses import dataclass

sys.path.insert(0, "/app/ai/compliance")

from analyze_document import detect_missing_disclosures


@dataclass
class FakeRule:
    id: str
    text: str
    embedding: list


def test_mixed_case_one_present_others_absent():
    """
    The exact scenario TA-48 describes: one disclosure present, others
    missing. Before the fix, the one close match (rule_present) would
    have driven the GLOBAL minimum down, suppressing flags for the
    other two. After the fix, each rule is checked on its own.
    """
    rule_present = FakeRule(id="r1", text="Disclosure A (present)", embedding=[1.0, 0.0, 0.0])
    rule_missing_1 = FakeRule(id="r2", text="Disclosure B (missing)", embedding=[0.0, 1.0, 0.0])
    rule_missing_2 = FakeRule(id="r3", text="Disclosure C (missing)", embedding=[0.0, 0.0, 1.0])

    # Simulates a document paragraph that matches rule_present exactly.
    chunk_embeddings = [[1.0, 0.0, 0.0]]

    missing = detect_missing_disclosures(
        chunk_embeddings,
        [rule_present, rule_missing_1, rule_missing_2],
    )

    missing_ids = {f["rule_id"] for f in missing}
    assert "r1" not in missing_ids, "the present disclosure must NOT be flagged"
    assert "r2" in missing_ids, "missing disclosure B must be flagged independently"
    assert "r3" in missing_ids, "missing disclosure C must be flagged independently"
    assert len(missing) == 2, "exactly the two genuinely-missing disclosures, no more, no less"


def test_all_disclosures_present_produces_no_flags():
    rule_a = FakeRule(id="r1", text="Disclosure A", embedding=[1.0, 0.0, 0.0])
    rule_b = FakeRule(id="r2", text="Disclosure B", embedding=[0.0, 1.0, 0.0])

    # Two chunks, one matching each disclosure.
    chunk_embeddings = [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0]]

    missing = detect_missing_disclosures(chunk_embeddings, [rule_a, rule_b])
    assert missing == []


def test_all_disclosures_missing_flags_every_one():
    rule_a = FakeRule(id="r1", text="Disclosure A", embedding=[1.0, 0.0, 0.0])
    rule_b = FakeRule(id="r2", text="Disclosure B", embedding=[0.0, 1.0, 0.0])

    # Chunk embedding orthogonal to both -- matches neither.
    chunk_embeddings = [[0.0, 0.0, 1.0]]

    missing = detect_missing_disclosures(chunk_embeddings, [rule_a, rule_b])
    missing_ids = {f["rule_id"] for f in missing}
    assert missing_ids == {"r1", "r2"}
