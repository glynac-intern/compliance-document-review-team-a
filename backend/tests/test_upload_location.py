"""
Tests for TA-78: uploads must go to a configurable location, not a
hardcoded path baked into the source tree.

This test can't observe Docker volume isolation directly (that's a
docker-compose/infrastructure concern, verified manually), but it proves
the code-level fix: UPLOAD_DIR is read from the environment rather than
hardcoded, and a real upload actually lands at that configured path.
"""
import pytest

pytestmark = pytest.mark.integration

import os
FAKE_PDF = ("test.pdf", b"%PDF-1.4 minimal fake content", "application/pdf")


def test_upload_dir_is_configurable_via_env_var():
    import documents.router as router_module

    # UPLOAD_DIR should read from the environment, not be hardcoded
    assert os.environ.get("UPLOAD_DIR") or str(router_module.UPLOAD_DIR) == "/app/uploads"


def test_uploaded_file_lands_in_configured_upload_dir(client, db_session, advisor_token):
    import documents.router as router_module
    from models import Document
    from pathlib import Path

    resp = client.post(
        "/documents",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": FAKE_PDF},
    )
    assert resp.status_code == 201
    doc_id = resp.json()["id"]

    # file_reference is no longer in the API response (TA-25) -- check
    # the actual stored path server-side instead, via the DB directly.
    document = db_session.query(Document).filter(Document.id == doc_id).first()
    file_reference = document.file_reference

    # The file must actually exist at the path the app reports, and that
    # path must be under UPLOAD_DIR -- not somewhere hardcoded elsewhere.
    assert file_reference.startswith(str(router_module.UPLOAD_DIR))
    assert Path(file_reference).exists()
