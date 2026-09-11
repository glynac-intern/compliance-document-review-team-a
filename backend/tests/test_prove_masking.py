"""
Tests for TA-33: prove the exact outbound vendor payload is masked --
submit a document seeded with a fake name, email, and account number,
capture the REAL payload sent to both the flagging (generation) call
and the summary call, and assert every seeded real value is absent
while placeholders are present.

Mocks the underlying Gemini client so no real network call happens in
CI, but the REAL pipeline (masking, chunking, retrieval, prompt
construction) runs genuinely -- only the actual HTTP-level API call is
faked. This is what makes the captured payload trustworthy: it's the
literal string the real code would have sent, not a hand-constructed
example.
"""
import sys
from unittest.mock import MagicMock, patch

sys.path.insert(0, "/app/ai/compliance")
sys.path.insert(0, "/app/data_pipeline/embeddings")

import analyze_document
import embed_client

FAKE_NAME = "Fake Testperson"
FAKE_EMAIL = "fake.testperson@example-fake-domain.com"
FAKE_PHONE = "(555) 000-1111"
FAKE_ACCOUNT = "99988877"

SEEDED_RAW_TEXT = (
    f"Dear Mr. {FAKE_NAME},\n\n"
    f"Thank you for your interest. Contact us at {FAKE_EMAIL} or {FAKE_PHONE}. "
    f"Your account #{FAKE_ACCOUNT} has been reviewed.\n\n"
    f"This strategy guarantees a steady return with no downside risk."
)


def _make_fake_client():
    """A mock genai client that responds plausibly to both embedding and
    generation calls, so the real pipeline runs end to end, while
    recording every call for later inspection."""
    client = MagicMock()

    def _fake_embed(**kwargs):
        contents = kwargs.get("contents", [])
        n = len(contents) if isinstance(contents, list) else 1
        resp = MagicMock()
        resp.embeddings = [MagicMock(values=[0.1] * 768) for _ in range(n)]
        return resp

    def _fake_generate(**kwargs):
        prompt = kwargs.get("contents", "")
        resp = MagicMock()
        if "JSON array" in prompt or "rule_id" in prompt:
            resp.text = "[]"  # flagging call -- no flags, keep it simple
        else:
            resp.text = "This is a fake summary containing no real PII."
        return resp

    client.models.embed_content.side_effect = _fake_embed
    client.models.generate_content.side_effect = _fake_generate
    return client


def test_outbound_payload_never_contains_seeded_real_pii(db_session):
    """
    The core TA-33 proof. Runs the REAL analyze_text() pipeline against
    text seeded with fake-but-realistic PII, captures every actual
    outbound generate_content call (both flagging AND summary), and
    asserts the real seeded values are absent while placeholders are
    present -- covering both required call types in one proof.
    """
    from models import Rule

    # A candidate rule must exist for the "guarantees a steady return"
    # chunk to trigger a real flagging call -- retrieve_candidate_rules
    # returns nothing from an empty rules table, and generate_flags_for_chunk
    # short-circuits (never calls the API) when there are no candidates.
    db_session.add(Rule(
        text="Advisors may not state or imply a guaranteed rate of return.",
        type="prohibited_claim",
        embedding=[0.1] * 768,
    ))
    db_session.commit()

    fake_client = _make_fake_client()

    with patch.object(analyze_document, "get_client", return_value=fake_client), \
         patch.object(embed_client, "get_client", return_value=fake_client):
        summary, flags, mapping, chunks_data = analyze_document.analyze_text(db_session, SEEDED_RAW_TEXT)

    captured_calls = fake_client.models.generate_content.call_args_list
    assert len(captured_calls) >= 2, "expected at least one flagging call and one summary call"

    captured_payloads = [call.kwargs["contents"] for call in captured_calls]

    # The actual proof: NONE of the real seeded values ever appear in
    # ANY outbound payload.
    for payload in captured_payloads:
        assert FAKE_NAME not in payload, f"real name leaked into outbound payload: {payload!r}"
        assert FAKE_EMAIL not in payload, f"real email leaked into outbound payload: {payload!r}"
        assert FAKE_PHONE not in payload, f"real phone leaked into outbound payload: {payload!r}"
        assert FAKE_ACCOUNT not in payload, f"real account number leaked into outbound payload: {payload!r}"

    # Placeholders ARE present somewhere -- proves masking actually ran,
    # not just that the real values happen to be coincidentally absent.
    all_payloads_combined = "\n---\n".join(captured_payloads)
    assert "[CLIENT_" in all_payloads_combined
    assert "[EMAIL_" in all_payloads_combined
    assert "[ACCOUNT_" in all_payloads_combined

    # Confirm both call types are genuinely represented, not just N
    # identical flagging calls with no summary call at all.
    flagging_calls = [p for p in captured_payloads if "JSON array" in p or "rule_id" in p]
    summary_calls = [p for p in captured_payloads if p not in flagging_calls]
    assert len(flagging_calls) >= 1, "no flagging (generation) call was captured"
    assert len(summary_calls) >= 1, "no summary call was captured"
