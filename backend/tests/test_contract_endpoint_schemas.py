"""
TA-123 (contract tests): validates that real API responses actually
conform to the shape FastAPI documents for them in its own generated
OpenAPI schema (app.openapi()) -- the live schema, computed fresh from
the same `app` object the `client` fixture serves requests against,
not a hand-maintained copy of it.

This exists because FastAPI's `response_model` normally guarantees this
for free -- but only for fields the endpoint's handler actually sets.
It says nothing about whether a frontend type consuming the response
(frontend/lib/documents-api.ts's BackendDocument /
BackendAnalysisResponse-shaped types) has drifted from it, since those
are hand-typed on the frontend with no automatic link back here. This
file is the "does the real payload match the documented contract"
half; a change here without an accompanying frontend type update is
exactly the drift these tests exist to catch.

Covers the three highest-risk endpoints identified when TA-123 was
scoped:
  - POST /documents            -> DocumentResponse
  - GET  /documents/{id}/analysis -> AnalysisResponse
  - POST /review/documents/{id}/decision -> ReviewResponse
(NOT POST /documents/{id}/review -- that path doesn't exist; the
review router is mounted at prefix /review in backend/main.py.)
"""

import jsonschema
import pytest

from main import app
from models import AIAnalysis, AnalysisStatus

pytestmark = pytest.mark.integration

FAKE_PDF = ("test.pdf", b"%PDF-1.4 minimal fake content", "application/pdf")


def _validate_against_schema(instance: dict, schema_name: str, openapi_schema: dict) -> None:
    """
    Resolves $ref pointers (e.g. AnalysisResponse -> FlagResponse ->
    MatchedRuleResponse) against the full OpenAPI document, the same
    way any real OpenAPI-aware client would.
    """
    component_schema = openapi_schema["components"]["schemas"][schema_name]
    resolver = jsonschema.RefResolver.from_schema(openapi_schema)
    jsonschema.validate(instance=instance, schema=component_schema, resolver=resolver)


def test_submit_document_response_matches_documentresponse_schema(client, advisor_token):
    resp = client.post(
        "/documents",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": FAKE_PDF},
    )
    assert resp.status_code == 201

    openapi_schema = app.openapi()
    _validate_against_schema(resp.json(), "DocumentResponse", openapi_schema)


def test_get_analysis_response_matches_analysisresponse_schema(client, db_session, advisor_token):
    submit = client.post(
        "/documents",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": FAKE_PDF},
    )
    doc_id = submit.json()["id"]

    # GET .../analysis synchronously runs the real AI pipeline when the
    # row is still not_started (see documents/router.py's get_analysis),
    # which 503s with no live AI key configured -- that's TA-87's
    # graceful-degradation behavior, not a bug. Force it to in_progress
    # directly first, exactly like test_analysis_state.py's
    # test_get_analysis_response_shape_for_not_yet_run_state does, so
    # this test exercises the response *shape* without depending on a
    # real LLM call succeeding.
    analysis = db_session.query(AIAnalysis).filter(AIAnalysis.document_id == doc_id).first()
    analysis.status = AnalysisStatus.in_progress
    db_session.commit()

    resp = client.get(
        f"/documents/{doc_id}/analysis",
        headers={"Authorization": f"Bearer {advisor_token}"},
    )
    assert resp.status_code == 200

    openapi_schema = app.openapi()
    _validate_against_schema(resp.json(), "AnalysisResponse", openapi_schema)


def test_submit_decision_response_matches_reviewresponse_schema(client, advisor_token, officer_token):
    submit = client.post(
        "/documents",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": FAKE_PDF},
    )
    doc_id = submit.json()["id"]

    resp = client.post(
        f"/review/documents/{doc_id}/decision",
        headers={"Authorization": f"Bearer {officer_token}"},
        json={"status": "approved", "comment": "Looks good."},
    )
    assert resp.status_code == 201

    openapi_schema = app.openapi()
    _validate_against_schema(resp.json(), "ReviewResponse", openapi_schema)
