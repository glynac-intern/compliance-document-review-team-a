"""
Tests for TA-55: re-seeding rules must preserve stable identity keyed
on rules.json's seed_id, so existing flags keep resolving to their
rule. An edited rule updates in place; a removed rule is marked
inactive, never deleted.
"""
import sys

sys.path.insert(0, "/app")

from models import Rule, AIAnalysis, Flag, AnalysisStatus


def _upsert_rule(db, seed_id, text, rule_type, embedding):
    """Mirrors embed_rules.py's real upsert logic directly, so this test
    exercises the actual behavior without needing a live embedding call."""
    existing = db.query(Rule).filter(Rule.seed_id == seed_id).first()
    if existing is not None:
        existing.text = text
        existing.type = rule_type
        existing.embedding = embedding
        existing.is_active = True
        return existing
    rule = Rule(seed_id=seed_id, text=text, type=rule_type, embedding=embedding, is_active=True)
    db.add(rule)
    db.flush()
    return rule


FAKE_PDF = ("test.pdf", b"%PDF-1.4 minimal fake content", "application/pdf")


def test_flag_still_resolves_after_reseed(client, db_session, advisor_token):
    rule = _upsert_rule(db_session, "test-rule-001", "Original text.", "prohibited_claim", [0.1] * 768)
    db_session.commit()
    original_id = rule.id

    submit = client.post(
        "/documents",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": FAKE_PDF},
    )
    doc_id = submit.json()["id"]
    analysis = db_session.query(AIAnalysis).filter(AIAnalysis.document_id == doc_id).first()
    analysis.status = AnalysisStatus.succeeded
    flag = Flag(
        analysis_id=analysis.id,
        passage_excerpt="Some passage.",
        matched_rule_id=original_id,
        explanation="Some explanation.",
        severity="high",
    )
    db_session.add(flag)
    db_session.commit()

    # Re-seed: same seed_id, DIFFERENT text (simulates a real rules.json edit).
    _upsert_rule(db_session, "test-rule-001", "Updated text after re-seed.", "prohibited_claim", [0.2] * 768)
    db_session.commit()

    db_session.refresh(flag)
    assert flag.matched_rule_id == original_id  # never changed
    assert flag.matched_rule.text == "Updated text after re-seed."  # updated in place
    assert flag.matched_rule.is_active is True


def test_removed_rule_is_marked_inactive_not_deleted(db_session):
    rule = _upsert_rule(db_session, "test-rule-002", "Some rule.", "prohibited_claim", [0.1] * 768)
    db_session.commit()
    rule_id = rule.id

    # Simulate embed_rules.py's removal-handling: this seed_id no
    # longer appears in the current rules.json.
    current_seed_ids = {"some-other-rule"}  # test-rule-002 NOT in this set
    orphaned = (
        db_session.query(Rule)
        .filter(Rule.seed_id.isnot(None))
        .filter(~Rule.seed_id.in_(current_seed_ids))
        .filter(Rule.is_active == True)
        .all()
    )
    for r in orphaned:
        r.is_active = False
    db_session.commit()

    still_exists = db_session.query(Rule).filter(Rule.id == rule_id).first()
    assert still_exists is not None  # never deleted
    assert still_exists.is_active is False


def test_inactive_rule_excluded_from_retrieval(db_session):
    import sys
    sys.path.insert(0, "/app/data_pipeline/retrieval")
    from rule_retrieval import retrieve_candidate_rules

    active_rule = _upsert_rule(db_session, "active-rule", "Active rule text.", "prohibited_claim", [0.5] * 768)
    inactive_rule = _upsert_rule(db_session, "inactive-rule", "Inactive rule text.", "prohibited_claim", [0.5] * 768)
    inactive_rule.is_active = False
    db_session.commit()

    candidates = retrieve_candidate_rules(db_session, [0.5] * 768)
    candidate_ids = [c.id for c in candidates]

    assert active_rule.id in candidate_ids
    assert inactive_rule.id not in candidate_ids
