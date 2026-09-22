"""
TA-104: removes a stray test/rehearsal document's entry from the real
precedent_index, without touching the underlying advisor account,
document, or review -- those stay as-is for audit history, only the
PrecedentIndex row(s) that let it surface as a "similar precedent" to
real officers are removed.

Precedent index is recomputed fresh on every analysis/chat call (never
cached), so deleting the row is enough -- nothing else needs to be
rebuilt afterward.

Dry-run by default: prints what it WOULD delete. Pass --delete to
actually remove it.

Run inside the backend container:
    docker compose run --rm backend python scripts/remove_stray_precedent.py
    docker compose run --rm backend python scripts/remove_stray_precedent.py --delete
    docker compose run --rm backend python scripts/remove_stray_precedent.py --search "some other term" --delete
"""

import argparse

from database import SessionLocal
from models import Document, PrecedentIndex, User

DEFAULT_SEARCH_TERMS = ["ta81", "rehearsal"]


def find_matching_precedents(db, search_terms: list[str]) -> list[PrecedentIndex]:
    """
    Matches on either the advisor's name or the document's own filename
    containing any of the search terms (case-insensitive) -- covers a
    stray test account ("TA81 Rehearsal") regardless of which field the
    giveaway name ended up in.
    """
    matches = {}
    for term in search_terms:
        pattern = f"%{term}%"
        rows = (
            db.query(PrecedentIndex)
            .join(Document, Document.id == PrecedentIndex.document_id)
            .join(User, User.id == Document.advisor_id)
            .filter((User.name.ilike(pattern)) | (Document.original_filename.ilike(pattern)))
            .all()
        )
        for row in rows:
            matches[row.id] = row
    return list(matches.values())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--search",
        action="append",
        dest="terms",
        help="Search term to match against advisor name / document filename "
        f"(case-insensitive substring). Repeatable. Default: {DEFAULT_SEARCH_TERMS}",
    )
    parser.add_argument("--delete", action="store_true", help="Actually delete the matched row(s).")
    args = parser.parse_args()
    terms = args.terms or DEFAULT_SEARCH_TERMS

    db = SessionLocal()
    try:
        matches = find_matching_precedents(db, terms)
        if not matches:
            print(f"No precedent_index rows matched search terms {terms}. Nothing to do.")
            return

        print(f"Found {len(matches)} matching precedent_index row(s):\n")
        for row in matches:
            document = db.query(Document).filter(Document.id == row.document_id).first()
            advisor = db.query(User).filter(User.id == document.advisor_id).first() if document else None
            print(f"  precedent_index.id = {row.id}")
            print(f"    document_id       = {row.document_id}")
            print(
                f"    document filename = {document.original_filename if document else '(document missing)'}"
            )
            print(f"    advisor           = {advisor.name if advisor else '(advisor missing)'}")
            print(f"    decision          = {row.decision.value}")
            print(f"    comment           = {row.comment!r}")
            print()

        if not args.delete:
            print("Dry run only -- nothing deleted. Re-run with --delete to remove these rows.")
            return

        for row in matches:
            db.delete(row)
        db.commit()
        print(
            f"Deleted {len(matches)} precedent_index row(s). "
            "The advisor account, document, and review are untouched."
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
