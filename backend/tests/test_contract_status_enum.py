"""
TA-123 (contract tests): the frontend hand-maintains a TypeScript union
(BackendDocumentStatus, in frontend/lib/documents-api.ts) that mirrors
this backend's DocumentStatus enum, with nothing to catch the two
drifting apart. STATUS_MAP in frontend/lib/document-adapter.ts is typed
against that union, so a Record<> already makes STATUS_MAP exhaustive
against BackendDocumentStatus at compile time -- but nothing checks
BackendDocumentStatus itself still matches the real backend enum.

This test is the backend half of that check: it re-derives the enum
from the LIVE OpenAPI schema (not by importing DocumentStatus directly
-- going through the schema is what the frontend actually sees) and
asserts it matches the committed fixture that both sides read. The
frontend half is frontend/tests/status-map-contract.test.ts, which
asserts STATUS_MAP's keys match the same fixture.

No DB or Docker needed: app.openapi() is pure schema introspection,
and main.py's routers no longer touch the database at import time
(see database.py's DATABASE_URL guard).
"""

import pytest

pytestmark = pytest.mark.unit

from scripts.export_contract_fixtures import FIXTURE_PATH, get_document_status_values
import json


def test_live_document_status_enum_matches_committed_fixture():
    live_values = get_document_status_values()
    committed_values = json.loads(FIXTURE_PATH.read_text())

    assert live_values == committed_values, (
        "backend/models.py's DocumentStatus enum no longer matches "
        f"{FIXTURE_PATH} -- run `python scripts/export_contract_fixtures.py` "
        "to regenerate it, and update frontend/lib/documents-api.ts's "
        "BackendDocumentStatus union (and document-adapter.ts's STATUS_MAP) "
        "to match."
    )


def test_document_status_enum_is_the_expected_four_values():
    """
    Pins the actual values, not just "fixture == schema" -- if someone
    "fixes" the drift by regenerating the fixture from a schema that
    silently lost a status, the two-sided check above would still pass
    while a real status went missing everywhere. This is what actually
    catches that: it has no dependency on the fixture file at all.
    """
    assert get_document_status_values() == [
        "approved",
        "needs_revision",
        "pending_review",
        "rejected",
    ]
