"""
TA-88: attacks the masker with adversarial inputs, per the ticket's own
list -- unusual formats, unicode, split lines, embedded PII in filenames
(i.e. PII-shaped text without natural sentence structure, as a real
filename's text would look if it were ever run through the masker).

test_masker.py proves the masker catches PII in its expected, well-formed
shape. This file is about the shapes it wasn't built for. Where a finding
is a real, containably-fixable gap, it's fixed here (see the regex
changes in masker.py this same commit touches). Where it's a genuine,
harder limitation, it's asserted as a documented miss -- not silently
left unasserted -- and folded into masker.py's KNOWN_LIMITATIONS.
"""

import pytest

pytestmark = pytest.mark.unit

from ai.masking.masker import mask_pii


# --- Unicode ---


def test_unicode_accented_name_is_masked():
    """Real names routinely have accented characters. [A-Z][a-z]+ is
    ASCII-only and does not match them -- found via this test, fixed in
    masker.py by widening the name character classes to be Unicode-aware
    rather than ASCII-literal ranges."""
    text = "Dear Mr. José García, your account is ready."
    masked, mapping = mask_pii(text)
    assert "José" not in masked
    assert "García" not in masked
    assert any("José García" in v for v in mapping.values())


def test_unicode_name_after_contact_verb_is_masked():
    text = "You can reach François Müller at your convenience."
    masked, mapping = mask_pii(text)
    assert "François" not in masked
    assert "Müller" not in masked


def test_unicode_in_surrounding_text_does_not_break_other_masking():
    """A café, an em-dash, a curly quote -- none of it should prevent an
    ordinary ASCII email/SSN elsewhere in the same text from being
    masked; the regex engine should not choke or mis-offset on Unicode
    it doesn't itself need to match."""
    text = "Notes from the café meeting — client's SSN is 123-45-6789, contact jane@example.com."
    masked, mapping = mask_pii(text)
    assert "123-45-6789" not in masked
    assert "jane@example.com" not in masked


# --- Split lines (PDF/DOCX extraction routinely wraps at arbitrary points) ---


def test_email_split_across_a_line_break_is_not_masked():
    """Documented miss, not silently unasserted: EMAIL_RE has no
    whitespace tolerance, so a real line-wrapped email leaks. Extraction
    could join hyphenated/wrapped lines before masking as a future fix;
    out of scope for this pass."""
    text = "Contact: jane.doe@\nexample.com for questions."
    masked, mapping = mask_pii(text)
    assert "jane.doe@" in masked and "example.com" in masked, (
        "if this now fails, the masker started handling split lines -- "
        "update KNOWN_LIMITATIONS and this test together"
    )


def test_ssn_split_across_a_line_break_is_not_masked():
    text = "SSN on file: 123-45-\n6789"
    masked, mapping = mask_pii(text)
    assert "123-45-" in masked


# --- Unusual formats ---


def test_ssn_without_dashes_is_not_masked():
    """Documented miss: SSN_RE requires the dashed 123-45-6789 shape.
    A bare 9-digit run is indistinguishable from any other 9-digit
    number (an account number, a reference code) without dashes as the
    anchor, so this is a deliberate precision/recall tradeoff, not an
    oversight -- but it must be tested and stated, not assumed."""
    text = "SSN: 123456789"
    masked, mapping = mask_pii(text)
    assert "123456789" in masked


def test_phone_with_extension_partially_masked():
    """The base number is still caught; the extension survives as
    trailing text since PHONE_RE has no notion of 'x1234'/'ext. 1234'."""
    text = "Call (555) 123-4567 x4521 for support."
    masked, mapping = mask_pii(text)
    assert "555" not in masked or "123-4567" not in masked  # base number masked
    assert "x4521" in masked


def test_international_phone_format_is_not_masked():
    """Documented miss: PHONE_RE is US-format-only (optional leading 1,
    3-3-4 grouping). A +44/other-country format is not recognized."""
    text = "Reach the client at +44 20 7946 0958."
    masked, mapping = mask_pii(text)
    assert "7946 0958" in masked


def test_po_box_address_is_not_masked():
    """Documented in KNOWN_LIMITATIONS already; asserted here so the
    documentation is backed by a real, running check rather than a
    comment nobody verifies."""
    text = "Please mail statements to P.O. Box 4521, Springfield, IL."
    masked, mapping = mask_pii(text)
    assert "4521" in masked


# --- Embedded PII in filename-shaped text: no sentence structure,
# underscores/hyphens instead of spaces, exactly what mask_pii would see
# if a filename were ever run through it. ---


def test_ssn_embedded_in_filename_shaped_text_is_still_masked():
    """Found broken, fixed in this same pass: SSN_RE used \\b on both
    ends, and \\b treats underscore as a word character, so it silently
    failed to match here (no boundary between "_" and "1"). Now uses
    digit-specific negative lookarounds instead, so underscore/letter
    adjacency no longer defeats it."""
    text = "client_statement_123-45-6789_final.pdf"
    masked, mapping = mask_pii(text)
    assert "123-45-6789" not in masked


def test_email_embedded_in_filename_shaped_text_is_still_masked():
    text = "export-jane.doe@example.com-2024.csv"
    masked, mapping = mask_pii(text)
    assert "jane.doe@example.com" not in masked


def test_name_embedded_in_filename_shaped_text_is_not_masked():
    """Documented miss, consistent with test_name_without_title_is_not_
    masked in test_masker.py: NAME_RE requires a title (Mr./Mrs./Ms./Dr.)
    immediately before the name. A filename like this has no title, so
    the name is invisible to the masker -- exactly the real risk the
    ticket is pointing at: a client-supplied filename carrying a name
    reaches other users' screens with no masking applied at all,
    anywhere in this app, since filenames are never passed through
    mask_pii in the first place (only extracted document TEXT is)."""
    text = "John_Smith_portfolio_review.pdf"
    masked, mapping = mask_pii(text)
    assert "John_Smith" in masked or "John" in masked
