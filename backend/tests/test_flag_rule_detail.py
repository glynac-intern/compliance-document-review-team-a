"""
Tests for TA-40: a flag's matched rule must include its text and type,
not just a bare UUID, so the assist panel can render passage/rule/reason
without a second request.

Inserts a rule + cached analysis directly into the test DB (bypassing the
real LLM pipeline entirely) so this test is fast, deterministic, and
doesn't need a real Gemini API key -- it's testing the response schema,
not the AI logic itself (which is covered separately, manually).
"""
import sys

sys.path.insert(0, "/app")

from models import Rule, AIAnalysis, Flag, AnalysisStatus

FAKE_PDF = ("test.pdf", b"%PDF-1.4 minimal fake content", "application/pdf")


def test_flag_includes_matched_rule_text_and_type(client, db_session, advisor_token, officer_token):
    submit = client.post(
        "/documents",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": FAKE_PDF},
    )
    doc_id = submit.json()["id"]

    rule = Rule(
        text="Advisors may not state or imply a guaranteed rate of return.",
        type="prohibited_claim",
    )
    db_session.add(rule)
    db_session.flush()

    # submit_document already created a not_started AIAnalysis row --
    # reuse it rather than inserting a second one (uq_ai_analysis_document
    # would reject a duplicate).
    analysis = db_session.query(AIAnalysis).filter(AIAnalysis.document_id == doc_id).first()
    analysis.status = AnalysisStatus.succeeded
    analysis.summary = "Test summary."
    db_session.flush()

    flag = Flag(
        analysis_id=analysis.id,
        passage_excerpt="This investment guarantees returns.",
        matched_rule_id=rule.id,
        explanation="Claims a guaranteed return, which is prohibited.",
        severity="high",
    )
    db_session.add(flag)
    db_session.commit()

    resp = client.get(
        f"/documents/{doc_id}/analysis",
        headers={"Authorization": f"Bearer {officer_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()

    assert len(data["flags"]) == 1
    returned_flag = data["flags"][0]
    assert returned_flag["matched_rule"]["id"] == str(rule.id)
    assert returned_flag["matched_rule"]["text"] == rule.text
    assert returned_flag["matched_rule"]["type"] == "prohibited_claim"
