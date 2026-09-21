"""
TA-123: regenerates the committed contract fixtures from the backend's
LIVE FastAPI OpenAPI schema (app.openapi()), never from a hand-typed
copy of the enum values.

Today this covers one fixture -- the Document status enum -- because
that's the concrete drift risk TA-123 identified: frontend/lib/
document-adapter.ts's STATUS_MAP is typed against a hand-maintained
TypeScript union (BackendDocumentStatus) that has no automatic link
back to backend/models.py's real DocumentStatus enum. Add more
fixtures here the same way if other hand-maintained frontend types
need the same protection.

The committed fixture is the thing both sides check against:
  - backend/tests/test_contract_status_enum.py (unit-marked) re-derives
    the enum from the live schema and asserts it still matches this
    file, so backend drift fails CI immediately.
  - frontend/tests/status-map-contract.test.ts asserts
    STATUS_MAP's keys match this same file, so frontend drift fails
    CI immediately too.

Run inside the backend container after a real DocumentStatus change,
to update the fixture on purpose:
    docker compose run --rm backend python scripts/export_contract_fixtures.py

Dry-run (print instead of writing) with --check, which exits non-zero
if the committed fixture is stale -- this is what the pytest test uses
under the hood, exposed standalone for convenience:
    docker compose run --rm backend python scripts/export_contract_fixtures.py --check
"""
import argparse
import json
import sys
from pathlib import Path

FIXTURE_PATH = Path(__file__).parent.parent / "frontend" / "tests" / "fixtures" / "backend-status-enum.json"


def get_document_status_values() -> list[str]:
    """
    Pulls DocumentStatus's members from the live OpenAPI schema
    (app.openapi()), not from importing the enum class directly --
    going through the schema is what makes this a check of what the
    API actually documents/returns, the same thing a frontend
    consumer would see, rather than a shortcut that happens to import
    the same Python object under test.
    """
    from main import app  # local import: only needed once main is on sys.path

    schema = app.openapi()
    enum_values = schema["components"]["schemas"]["DocumentStatus"]["enum"]
    return sorted(enum_values)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="Exit 1 if the committed fixture doesn't match the live schema, without writing.",
    )
    args = parser.parse_args()

    live_values = get_document_status_values()

    if args.check:
        if not FIXTURE_PATH.exists():
            print(f"Fixture missing: {FIXTURE_PATH}", file=sys.stderr)
            return 1
        committed_values = json.loads(FIXTURE_PATH.read_text())
        if committed_values != live_values:
            print(
                f"Fixture is stale.\n  committed: {committed_values}\n  live:      {live_values}\n"
                "Run without --check to regenerate.",
                file=sys.stderr,
            )
            return 1
        print(f"OK -- {FIXTURE_PATH} matches the live schema.")
        return 0

    FIXTURE_PATH.parent.mkdir(parents=True, exist_ok=True)
    FIXTURE_PATH.write_text(json.dumps(live_values, indent=2) + "\n")
    print(f"Wrote {FIXTURE_PATH}: {live_values}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
