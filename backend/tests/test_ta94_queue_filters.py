"""
Tests for TA-94: the officer queue supports filtering by advisor and by
document type, on top of the existing status filter, all combining as
AND -- not OR.
"""

import pytest

pytestmark = pytest.mark.integration

FAKE_PDF = ("test.pdf", b"%PDF-1.4 minimal fake content", "application/pdf")


def _real_docx_bytes() -> bytes:
    import io
    from docx import Document as DocxDocument

    doc = DocxDocument()
    doc.add_paragraph("A real, valid, parseable DOCX document.")
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


FAKE_DOCX = (
    "test.docx",
    _real_docx_bytes(),
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
)


def _submit(client, token, file=FAKE_PDF):
    resp = client.post("/documents", headers={"Authorization": f"Bearer {token}"}, files={"file": file})
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


def _signup_advisor(client, email):
    signup = client.post("/auth/signup", json={
        "name": "Second Advisor", "email": email, "password": "testpass123", "role": "advisor",
    })
    assert signup.status_code == 201
    login = client.post("/auth/login", json={"email": email, "password": "testpass123"})
    return login.json()["access_token"]


def test_queue_with_no_filters_returns_everything_unchanged(client, advisor_token, officer_token):
    _submit(client, advisor_token, FAKE_PDF)
    _submit(client, advisor_token, FAKE_DOCX)

    resp = client.get("/review/queue", headers={"Authorization": f"Bearer {officer_token}"})
    assert resp.status_code == 200
    assert len(resp.json()) == 2


def test_filter_by_advisor_id(client, advisor_token, officer_token):
    doc1 = _submit(client, advisor_token)
    second_token = _signup_advisor(client, "ta94-second-advisor@rolefixture.io")
    _submit(client, second_token)

    me = client.get("/auth/me", headers={"Authorization": f"Bearer {advisor_token}"}).json()
    resp = client.get(
        f"/review/queue?advisor_id={me['id']}",
        headers={"Authorization": f"Bearer {officer_token}"},
    )
    assert resp.status_code == 200
    docs = resp.json()
    assert len(docs) == 1
    assert docs[0]["id"] == doc1


def test_filter_by_type(client, advisor_token, officer_token):
    pdf_id = _submit(client, advisor_token, FAKE_PDF)
    _submit(client, advisor_token, FAKE_DOCX)

    resp = client.get("/review/queue?type=pdf", headers={"Authorization": f"Bearer {officer_token}"})
    assert resp.status_code == 200
    docs = resp.json()
    assert len(docs) == 1
    assert docs[0]["id"] == pdf_id
    assert docs[0]["type"] == "pdf"


def test_status_advisor_and_type_filters_combine_as_and(client, advisor_token, officer_token):
    # Same advisor, two documents: one pdf (left pending), one docx (decided)
    pending_pdf = _submit(client, advisor_token, FAKE_PDF)
    decided_docx = _submit(client, advisor_token, FAKE_DOCX)
    assert client.post(
        f"/review/documents/{decided_docx}/decision",
        headers={"Authorization": f"Bearer {officer_token}"},
        json={"status": "approved", "comment": "Fine."},
    ).status_code == 201

    # A second advisor's pending pdf must never leak into the results below
    second_token = _signup_advisor(client, "ta94-and-check@rolefixture.io")
    _submit(client, second_token, FAKE_PDF)

    me = client.get("/auth/me", headers={"Authorization": f"Bearer {advisor_token}"}).json()

    resp = client.get(
        f"/review/queue?status=pending_review&type=pdf&advisor_id={me['id']}",
        headers={"Authorization": f"Bearer {officer_token}"},
    )
    assert resp.status_code == 200
    docs = resp.json()
    assert len(docs) == 1
    assert docs[0]["id"] == pending_pdf

    # Same advisor_id + type, but the status that matches the OTHER
    # document -- proves this isn't accidentally OR-ing the filters.
    resp2 = client.get(
        f"/review/queue?status=pending_review&type=docx&advisor_id={me['id']}",
        headers={"Authorization": f"Bearer {officer_token}"},
    )
    assert resp2.json() == []
