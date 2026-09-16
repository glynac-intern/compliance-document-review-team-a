"""
Tests for TA-87: the review path must survive the AI vendor being gone.
_execute_analysis() converts any pipeline failure into a clean 503 and
persists status=failed rather than raising an unhandled exception or
leaving the row stuck -- but before this, nothing actually exercised the
real failure modes (no key, rate limit, timeout, malformed response)
through the real call path; TA-41's tests only ever set AnalysisStatus
directly, bypassing _execute_analysis entirely.

Mocks the LLM client (google.genai) rather than making real calls -- same
approach as test_pii_embedding_guard.py and test_precedent_indexing.py.
Two names need patching, not one: analyze_text's own `client = get_client()`
call resolves against ai.compliance.analyze_document's globals, while
embed_texts_batch's internal `get_client()` call resolves against
data_pipeline.embeddings.embed_client's globals -- each function's global
lookup is anchored to the module it's DEFINED in, not the module that
imported it, so both must be patched for one fake client to reach both
call sites consistently.
"""
from unittest.mock import MagicMock, patch

import ai.compliance.analyze_document as analyze_document
import data_pipeline.embeddings.embed_client as embed_client
from models import AIAnalysis, AnalysisStatus, DocumentChunk, Flag, PIIMapping, Rule


class _StubGenAIClient:
    """Stands in for genai.Client with independently controllable failure
    modes for the embedding call vs. the generation call, matching the
    real client's shape (client.models.embed_content / .generate_content)."""

    def __init__(self, embed_error=None, generate_error=None, embed_dim=768, generate_text="A short summary."):
        self._embed_error = embed_error
        self._generate_error = generate_error
        self._embed_dim = embed_dim
        self._generate_text = generate_text
        self.models = self

    def embed_content(self, *, contents, **_kwargs):
        if self._embed_error is not None:
            raise self._embed_error
        response = MagicMock()
        response.embeddings = [MagicMock(values=[0.1] * self._embed_dim) for _ in contents]
        return response

    def generate_content(self, **_kwargs):
        if self._generate_error is not None:
            raise self._generate_error
        response = MagicMock()
        response.text = self._generate_text
        return response


def _patched_client(fake_client=None, **stub_kwargs):
    """Patches both get_client call sites at once (see module docstring
    for why both are needed). Pass either a ready-made fake_client, or
    kwargs for _StubGenAIClient."""
    from contextlib import ExitStack

    client = fake_client if fake_client is not None else _StubGenAIClient(**stub_kwargs)
    stack = ExitStack()
    stack.enter_context(patch.object(embed_client, "get_client", return_value=client))
    stack.enter_context(patch.object(analyze_document, "get_client", return_value=client))
    return stack


def _real_docx_bytes(text: str) -> bytes:
    """A genuinely valid, parseable DOCX with real prose (no PII) --
    extract_text() and the masker both run for real in these tests; only
    the vendor client itself is mocked."""
    import io
    from docx import Document as DocxDocument

    doc = DocxDocument()
    doc.add_paragraph(text)
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


def _submit_docx(client, advisor_token, text="This is a plain client-facing document with no PII in it."):
    resp = client.post(
        "/documents",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": (
            "test.docx",
            _real_docx_bytes(text),
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


def test_missing_api_key_document_and_queue_endpoints_still_succeed(client, advisor_token, officer_token):
    """Document access and the officer queue must have zero coupling to
    the AI vendor -- they must keep working even when it can't even
    construct a client (the real failure when LLM_API_KEY is unset)."""
    doc_id = _submit_docx(client, advisor_token)

    with patch.object(embed_client, "get_client", side_effect=KeyError("LLM_API_KEY")), \
         patch.object(analyze_document, "get_client", side_effect=KeyError("LLM_API_KEY")):
        doc_resp = client.get(
            f"/documents/{doc_id}",
            headers={"Authorization": f"Bearer {advisor_token}"},
        )
        queue_resp = client.get(
            "/review/queue",
            headers={"Authorization": f"Bearer {officer_token}"},
        )

    assert doc_resp.status_code == 200
    assert queue_resp.status_code == 200


def test_missing_api_key_analysis_fails_cleanly_as_503(client, db_session, advisor_token):
    doc_id = _submit_docx(client, advisor_token)

    with patch.object(embed_client, "get_client", side_effect=KeyError("LLM_API_KEY")), \
         patch.object(analyze_document, "get_client", side_effect=KeyError("LLM_API_KEY")):
        resp = client.get(
            f"/documents/{doc_id}/analysis",
            headers={"Authorization": f"Bearer {advisor_token}"},
        )

    assert resp.status_code == 503

    analysis = db_session.query(AIAnalysis).filter(AIAnalysis.document_id == doc_id).first()
    assert analysis.status == AnalysisStatus.failed
    assert "LLM_API_KEY" in analysis.error_message


def test_decision_can_be_recorded_when_vendor_unavailable(client, db_session, advisor_token, officer_token):
    """Precedent indexing (which calls the embedding API) must never
    block an officer's decision from being recorded -- reviews/router.py
    already wraps it in a try/except; this proves it end-to-end through
    the real endpoint rather than only unit-testing the indexer."""
    doc_id = _submit_docx(client, advisor_token)

    with patch("ai.compliance.precedent_indexer.embed_text", side_effect=KeyError("LLM_API_KEY")):
        resp = client.post(
            f"/review/documents/{doc_id}/decision",
            headers={"Authorization": f"Bearer {officer_token}"},
            json={"status": "approved", "comment": "Looks fine."},
        )

    assert resp.status_code == 201


def test_rate_limited_vendor_response_fails_cleanly_as_503(client, db_session, advisor_token):
    doc_id = _submit_docx(client, advisor_token)
    rate_limit_error = Exception("429 RESOURCE_EXHAUSTED: rate limit exceeded")

    with _patched_client(embed_error=rate_limit_error), patch("time.sleep"):
        resp = client.get(
            f"/documents/{doc_id}/analysis",
            headers={"Authorization": f"Bearer {advisor_token}"},
        )

    assert resp.status_code == 503
    analysis = db_session.query(AIAnalysis).filter(AIAnalysis.document_id == doc_id).first()
    assert analysis.status == AnalysisStatus.failed
    assert "429" in analysis.error_message or "RESOURCE_EXHAUSTED" in analysis.error_message


def test_timed_out_vendor_response_fails_cleanly_as_503(client, db_session, advisor_token):
    doc_id = _submit_docx(client, advisor_token)

    with _patched_client(embed_error=TimeoutError("Request timed out")), patch("time.sleep"):
        resp = client.get(
            f"/documents/{doc_id}/analysis",
            headers={"Authorization": f"Bearer {advisor_token}"},
        )

    assert resp.status_code == 503
    analysis = db_session.query(AIAnalysis).filter(AIAnalysis.document_id == doc_id).first()
    assert analysis.status == AnalysisStatus.failed
    assert "timed out" in analysis.error_message.lower()


def test_malformed_vendor_response_fails_cleanly_not_partial_state(client, db_session, advisor_token):
    """Embedding succeeds, but generation comes back malformed (no usable
    .text, as if the vendor returned an empty/garbage payload). Must fail
    as a clean 503, and must leave no partial Flag/DocumentChunk/PIIMapping
    rows behind -- the pipeline raises before any of those are persisted,
    so a malformed response must not corrupt state either."""
    doc_id = _submit_docx(client, advisor_token)

    class _MalformedResponse:
        text = None  # simulates a vendor response with no text field

    fake_client = _StubGenAIClient()
    fake_client.generate_content = lambda **_kwargs: _MalformedResponse()

    with _patched_client(fake_client=fake_client), patch("time.sleep"):
        resp = client.get(
            f"/documents/{doc_id}/analysis",
            headers={"Authorization": f"Bearer {advisor_token}"},
        )

    assert resp.status_code == 503

    analysis = db_session.query(AIAnalysis).filter(AIAnalysis.document_id == doc_id).first()
    assert analysis.status == AnalysisStatus.failed
    assert db_session.query(Flag).filter(Flag.analysis_id == analysis.id).count() == 0
    assert db_session.query(DocumentChunk).filter(DocumentChunk.document_id == doc_id).count() == 0
    assert db_session.query(PIIMapping).filter(PIIMapping.document_id == doc_id).count() == 0


def test_failed_retry_leaves_previous_successful_analysis_intact(client, db_session, advisor_token):
    """A failed RETRY must not destroy a prior successful analysis. Seeds
    a succeeded AIAnalysis + Flag directly (same approach as
    test_flag_rule_detail.py), then retries with the vendor unavailable."""
    doc_id = _submit_docx(client, advisor_token)

    rule = Rule(text="Advisors may not state or imply a guaranteed rate of return.", type="prohibited_claim")
    db_session.add(rule)
    db_session.flush()

    analysis = db_session.query(AIAnalysis).filter(AIAnalysis.document_id == doc_id).first()
    analysis.status = AnalysisStatus.succeeded
    analysis.summary = "Original summary from a prior successful run."
    db_session.flush()

    db_session.add(Flag(
        analysis_id=analysis.id,
        passage_excerpt="This investment guarantees returns.",
        matched_rule_id=rule.id,
        explanation="Claims a guaranteed return, which is prohibited.",
        severity="high",
    ))
    db_session.commit()

    with patch.object(embed_client, "get_client", side_effect=KeyError("LLM_API_KEY")), \
         patch.object(analyze_document, "get_client", side_effect=KeyError("LLM_API_KEY")):
        retry_resp = client.post(
            f"/documents/{doc_id}/analysis/retry",
            headers={"Authorization": f"Bearer {advisor_token}"},
        )

    assert retry_resp.status_code == 503

    db_session.expire_all()
    surviving_flags = db_session.query(Flag).filter(Flag.analysis_id == analysis.id).all()
    assert len(surviving_flags) == 1, (
        "a failed retry deleted the previously cached successful analysis -- "
        "retry must only replace old results once the NEW run has actually "
        "succeeded, never up front"
    )
    assert surviving_flags[0].explanation == "Claims a guaranteed return, which is prohibited."
