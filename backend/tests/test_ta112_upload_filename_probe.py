"""
Tests for TA-112: probe upload filenames for path traversal / null-byte
injection. test_hide_file_path.py covers not EXPOSING the server-side
storage path in responses; test_file_signature.py/test_upload_size_cap.py
cover content-type and size validation -- nothing before this probed the
`filename` an attacker supplies on POST /documents itself.

Code-reading first: _save_upload (documents/router.py:114-140) builds
the on-disk path as `UPLOAD_DIR / f"{document_id}.{ext}"`, where
document_id is a server-generated UUID and ext comes from a lookup
table keyed by the DETECTED file type (magic-byte sniffing) -- never
from file.filename (TA-23's own comment says as much). The download
endpoint (documents/router.py:277-305) does the same for the
Content-Disposition filename it sends back. So file.filename is never
used to build a filesystem path or header anywhere -- these tests
confirm that structurally, empirically, rather than just trusting the
comment, and separately check the DISPLAY-ONLY use of the filename
(original_filename, truncated to 255 chars) doesn't crash on hostile
input.
"""

import pytest

pytestmark = pytest.mark.integration

from pathlib import Path

import documents.router as router_module
from models import Document

FAKE_PDF_BYTES = b"%PDF-1.4 minimal fake content"
FAKE_PDF_CONTENT_TYPE = "application/pdf"


def _upload(client, advisor_token, filename):
    return client.post(
        "/documents",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": (filename, FAKE_PDF_BYTES, FAKE_PDF_CONTENT_TYPE)},
    )


def test_path_traversal_filename_never_escapes_the_upload_directory(client, db_session, advisor_token):
    resp = _upload(client, advisor_token, "../../../../etc/passwd")
    assert resp.status_code == 201, resp.text
    doc_id = resp.json()["id"]

    document = db_session.query(Document).filter(Document.id == doc_id).first()
    stored_path = Path(document.file_reference).resolve()
    upload_dir = router_module.UPLOAD_DIR.resolve()

    # The stored path must be a direct child of UPLOAD_DIR -- not
    # merely "somewhere under it", and definitely not outside it.
    assert stored_path.parent == upload_dir
    assert stored_path.exists()
    # And the client-supplied filename must have had zero influence on
    # where the file landed -- the stored name is document_id-derived.
    assert stored_path.name.startswith(doc_id)
    assert "passwd" not in stored_path.name
    assert ".." not in stored_path.name


def test_null_byte_in_filename_does_not_crash_upload(client, advisor_token):
    resp = _upload(client, advisor_token, "evil.pdf\x00.exe")
    assert resp.status_code != 500, resp.text


def test_long_filename_within_header_limit_is_accepted_and_truncated(client, advisor_token):
    """A filename well past the app's own 255-char display cap, but
    still comfortably under python-multipart's per-header-line limit
    (see the next test) -- confirms _save_upload's own [:255] slicing
    still does its job for filenames that make it that far."""
    long_filename = ("A" * 500) + ".pdf"
    resp = _upload(client, advisor_token, long_filename)
    assert resp.status_code == 201, resp.text
    assert len(resp.json()["original_filename"]) <= 255


def test_extremely_long_filename_is_rejected_cleanly_not_a_crash(client, advisor_token):
    """TA-127: python-multipart 0.0.31 caps a single multipart header
    line at DEFAULT_MAX_HEADER_SIZE (4096 + 128 bytes) -- one of the
    DoS-hardening fixes that version bump was for. A 5000-char filename
    blows past that inside the Content-Disposition header line, so the
    request is now rejected as a malformed body (400) before it ever
    reaches _save_upload's own truncation logic, rather than being
    parsed and truncated at the app layer (0.0.9's behavior, and what
    this test asserted before TA-127). Still a clean failure either
    way -- the thing this test actually guards is "never a 500", which
    still holds."""
    huge_filename = ("A" * 5000) + ".pdf"
    resp = _upload(client, advisor_token, huge_filename)
    assert resp.status_code != 500, resp.text
    assert resp.status_code == 400, resp.text


def test_download_endpoint_filename_is_also_never_client_derived(client, db_session, advisor_token):
    """Same guarantee on the way back out -- the Content-Disposition
    filename FileResponse sends is server-derived (document id + type),
    confirmed by inspecting what download_document_file actually builds,
    not by trusting the docstring."""
    resp = _upload(client, advisor_token, "../../etc/shadow")
    assert resp.status_code == 201, resp.text
    doc_id = resp.json()["id"]

    download = client.get(
        f"/documents/{doc_id}/file",
        headers={"Authorization": f"Bearer {advisor_token}"},
    )
    assert download.status_code == 200
    content_disposition = download.headers.get("content-disposition", "")
    assert "shadow" not in content_disposition
    assert ".." not in content_disposition
    assert doc_id in content_disposition
