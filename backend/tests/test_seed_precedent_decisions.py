"""
Tests for TA-59: seeded documents carry a plausible decision and
officer comment, with genuine variety (not one templated string
repeated across dozens of documents), and no real client data.
"""
import json
from pathlib import Path
import pytest

pytestmark = pytest.mark.unit

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
SEED_DIR = Path("/app/seed") if Path("/app/seed").exists() else (REPO_ROOT / "seed")


def test_metadata_has_decision_and_comment_on_every_document():
    data = json.loads((SEED_DIR / "documents" / "metadata.json").read_text())
    for doc in data:
        assert "decision" in doc
        assert "officer_comment" in doc
        assert doc["decision"] in ("approved", "needs_revision")
        assert len(doc["officer_comment"]) > 0


def test_decisions_are_consistent_with_ground_truth():
    """A clean document should be approved; a document with issues
    should need revision -- decisions must be MEANINGFUL, not random."""
    data = json.loads((SEED_DIR / "documents" / "metadata.json").read_text())
    for doc in data:
        if doc["is_clean"]:
            assert doc["decision"] == "approved"
        else:
            assert doc["decision"] == "needs_revision"


def test_genuine_comment_variety_not_one_template():
    data = json.loads((SEED_DIR / "documents" / "metadata.json").read_text())
    unique_comments = len(set(d["officer_comment"] for d in data))
    # Not asserting a huge number -- just genuinely more than a
    # near-single-template corpus would produce.
    assert unique_comments >= 20, (
        f"only {unique_comments} unique comments across {len(data)} documents -- "
        f"looks templated, not genuinely varied"
    )


def test_no_real_names_in_seeded_comments():
    """A light sanity check: officer comments shouldn't reference any
    of the synthetic client names planted in the corpus -- comments
    are about the DECISION, not about a specific person."""
    data = json.loads((SEED_DIR / "documents" / "metadata.json").read_text())
    suspicious_markers = ["@", "Mr.", "Mrs.", "Ms.", "Dr."]
    for doc in data:
        comment = doc["officer_comment"]
        for marker in suspicious_markers:
            assert marker not in comment, f"{doc['filename']}: comment references a name/contact detail"
