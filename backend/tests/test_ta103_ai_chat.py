"""
Tests for TA-103: POST /review/documents/{document_id}/chat previously
didn't exist, so the frontend always fell through to a fixed, keyword-
matched local fallback -- even a plain factual question like "what is
the title of this document?" got back generic FINRA/SEC boilerplate.

Mocks the LLM client (google.genai), same approach as
test_ta87_ai_outage_resilience.py -- these tests exercise the route's
context-building and error handling, not the real model.
"""

import pytest

pytestmark = pytest.mark.integration

from unittest.mock import MagicMock, patch

import reviews.router as reviews_router
from models import AIAnalysis, AnalysisStatus, DocumentChunk, PIIMapping

FAKE_PDF = ("test.pdf", b"%PDF-1.4 minimal fake content", "application/pdf")


class _StubGenAIClient:
    def __init__(self, generate_text=None, generate_error=None):
        self._generate_text = generate_text
        self._generate_error = generate_error
        self.models = self

    def generate_content(self, **_kwargs):
        if self._generate_error is not None:
            raise self._generate_error
        response = MagicMock()
        response.text = self._generate_text
        return response


def _submit(client, advisor_token):
    resp = client.post(
        "/documents",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": FAKE_PDF},
    )
    return resp.json()["id"]


def test_chat_answers_the_actual_question_not_boilerplate(client, db_session, advisor_token, officer_token):
    doc_id = _submit(client, advisor_token)

    analysis = db_session.query(AIAnalysis).filter(AIAnalysis.document_id == doc_id).first()
    analysis.status = AnalysisStatus.succeeded
    analysis.summary = "A marketing brochure for a growth fund."
    db_session.add(
        DocumentChunk(
            document_id=doc_id, chunk_index=0, masked_text="This brochure is titled 'Growth Fund Overview'."
        )
    )
    db_session.commit()

    stub = _StubGenAIClient(
        generate_text='{"reply": "The document is titled \\"Growth Fund Overview\\".", "suggested_decision_note": null}'
    )
    with patch.object(reviews_router, "get_client", return_value=stub):
        resp = client.post(
            f"/review/documents/{doc_id}/chat",
            headers={"Authorization": f"Bearer {officer_token}"},
            json={"message": "What is the title of this document?", "history": []},
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["reply"] == 'The document is titled "Growth Fund Overview".'
    assert "FINRA Rule 2210" not in data["reply"]
    assert data["suggested_decision_note"] is None


def test_chat_unmasks_pii_placeholders_before_returning(client, db_session, advisor_token, officer_token):
    doc_id = _submit(client, advisor_token)

    db_session.add(DocumentChunk(document_id=doc_id, chunk_index=0, masked_text="Prepared for [CLIENT_1]."))
    db_session.add(PIIMapping(document_id=doc_id, placeholder="[CLIENT_1]", original_value="Jane Smith"))
    db_session.commit()

    stub = _StubGenAIClient(
        generate_text='{"reply": "This document was prepared for [CLIENT_1].", "suggested_decision_note": "Approved for [CLIENT_1]."}'
    )
    with patch.object(reviews_router, "get_client", return_value=stub):
        resp = client.post(
            f"/review/documents/{doc_id}/chat",
            headers={"Authorization": f"Bearer {officer_token}"},
            json={"message": "Who is this document for?", "history": []},
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["reply"] == "This document was prepared for Jane Smith."
    assert data["suggested_decision_note"] == "Approved for Jane Smith."


def test_chat_returns_503_on_ai_outage_not_silent_fallback(client, advisor_token, officer_token):
    doc_id = _submit(client, advisor_token)

    with patch.object(reviews_router, "get_client", side_effect=KeyError("LLM_API_KEY")):
        resp = client.post(
            f"/review/documents/{doc_id}/chat",
            headers={"Authorization": f"Bearer {officer_token}"},
            json={"message": "What is the title of this document?", "history": []},
        )

    assert resp.status_code == 503


def test_advisor_cannot_use_officer_chat_endpoint(client, advisor_token):
    doc_id = _submit(client, advisor_token)

    resp = client.post(
        f"/review/documents/{doc_id}/chat",
        headers={"Authorization": f"Bearer {advisor_token}"},
        json={"message": "What is the title of this document?", "history": []},
    )

    assert resp.status_code == 403
