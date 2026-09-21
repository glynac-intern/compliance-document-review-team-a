"""
Regression test for TA-48: disclosure-by-absence must evaluate each
required disclosure INDEPENDENTLY.

Updated for TA-52: distance is now computed in pgvector (not pure
Python), so these tests use REAL Rule rows in the test database rather
than synthetic FakeRule objects -- a real pgvector column requires
genuine 768-dimension vectors, and the query itself needs real rows to
run against.
"""
import pytest

pytestmark = pytest.mark.integration

from ai.compliance.analyze_document import detect_missing_disclosures
from models import Rule


def _vector_at(hot_index: int, dim: int = 768) -> list[float]:
    """A unit vector with a single 1.0 at hot_index, zeros elsewhere --
    identical vectors have cosine distance 0, orthogonal ones have
    distance 1. Gives us a controlled present/absent scenario."""
    v = [0.0] * dim
    v[hot_index] = 1.0
    return v


def test_mixed_case_one_present_others_absent(db_session):
    """
    The exact scenario TA-48 describes: one disclosure present, others
    missing. Before the original fix, the one close match would have
    driven a GLOBAL minimum down, suppressing flags for the others.
    """
    rule_present = Rule(text="Disclosure A (present)", type="disclosure", embedding=_vector_at(0))
    rule_missing_1 = Rule(text="Disclosure B (missing)", type="disclosure", embedding=_vector_at(1))
    rule_missing_2 = Rule(text="Disclosure C (missing)", type="disclosure", embedding=_vector_at(2))
    db_session.add_all([rule_present, rule_missing_1, rule_missing_2])
    db_session.flush()

    # Simulates a document paragraph that matches rule_present exactly.
    chunk_embeddings = [_vector_at(0)]

    missing = detect_missing_disclosures(db_session, chunk_embeddings, [rule_present, rule_missing_1, rule_missing_2])

    missing_ids = {f["rule_id"] for f in missing}
    assert str(rule_present.id) not in missing_ids, "the present disclosure must NOT be flagged"
    assert str(rule_missing_1.id) in missing_ids, "missing disclosure B must be flagged independently"
    assert str(rule_missing_2.id) in missing_ids, "missing disclosure C must be flagged independently"
    assert len(missing) == 2


def test_all_disclosures_present_produces_no_flags(db_session):
    rule_a = Rule(text="Disclosure A", type="disclosure", embedding=_vector_at(0))
    rule_b = Rule(text="Disclosure B", type="disclosure", embedding=_vector_at(1))
    db_session.add_all([rule_a, rule_b])
    db_session.flush()

    chunk_embeddings = [_vector_at(0), _vector_at(1)]

    missing = detect_missing_disclosures(db_session, chunk_embeddings, [rule_a, rule_b])
    assert missing == []


def test_all_disclosures_missing_flags_every_one(db_session):
    rule_a = Rule(text="Disclosure A", type="disclosure", embedding=_vector_at(0))
    rule_b = Rule(text="Disclosure B", type="disclosure", embedding=_vector_at(1))
    db_session.add_all([rule_a, rule_b])
    db_session.flush()

    # Orthogonal to both -- matches neither.
    chunk_embeddings = [_vector_at(2)]

    missing = detect_missing_disclosures(db_session, chunk_embeddings, [rule_a, rule_b])
    missing_ids = {f["rule_id"] for f in missing}
    assert missing_ids == {str(rule_a.id), str(rule_b.id)}
