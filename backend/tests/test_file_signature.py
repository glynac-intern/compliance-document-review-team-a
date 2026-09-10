"""
Tests for TA-23: upload type must be determined from the file's own
signature, not the client-supplied Content-Type header. A mislabelled
file (signature disagrees with declared type) must be rejected.
"""

REAL_PLAIN_TEXT_LABELLED_AS_PDF = ("fake.pdf", b"This is just plain text, not a real PDF.", "application/pdf")
REAL_PDF_MAGIC_BYTES = ("real.pdf", b"%PDF-1.4\n%fake but has the real magic bytes\n", "application/pdf")


def test_plain_text_mislabelled_as_pdf_is_rejected(client, advisor_token):
    """The exact vulnerability TA-23 describes: a client can label
    anything as a PDF. This must now be caught by signature, not trusted."""
    resp = client.post(
        "/documents",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": REAL_PLAIN_TEXT_LABELLED_AS_PDF},
    )
    assert resp.status_code == 400
    assert "signature" in resp.json()["detail"].lower()


def test_file_with_real_pdf_signature_is_accepted(client, advisor_token):
    """A file whose signature genuinely matches its declared type must
    still be accepted -- the fix shouldn't over-reject legitimate files."""
    resp = client.post(
        "/documents",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": REAL_PDF_MAGIC_BYTES},
    )
    assert resp.status_code == 201
    assert resp.json()["type"] == "pdf"


def test_stored_filename_never_uses_client_supplied_filename(client, advisor_token):
    """The stored filename must be server-derived (document id + detected
    type's extension) -- never anything from the client's filename."""
    malicious_filename_file = (
        "../../../etc/passwd.pdf",  # a deliberately hostile client filename
        b"%PDF-1.4\nreal pdf signature\n",
        "application/pdf",
    )
    resp = client.post(
        "/documents",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": malicious_filename_file},
    )
    assert resp.status_code == 201
    file_reference = resp.json()["file_reference"]
    # The stored path must be built from the document's own id, not
    # contain any trace of the client's hostile filename.
    assert resp.json()["id"] in file_reference
    assert "passwd" not in file_reference
    assert ".." not in file_reference
    assert file_reference.endswith(".pdf")
