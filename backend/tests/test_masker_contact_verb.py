"""
Tests for a name-masking gap found while verifying TA-49's precedent
backfill: a name following a contact verb ("reach", "contact", "call")
had no salutation/title nearby and was slipping through unmasked --
e.g. "You can reach Maria Gonzalez at..." Fixed with a narrow,
targeted heuristic (not a broad "any capitalized phrase" rule, which
would wrongly mask product names like "Balanced Growth Portfolio").
"""
from ai.masking.masker import mask_pii


def test_name_after_contact_verb_is_masked():
    text = "You can reach Maria Gonzalez at maria@example.com."
    masked, mapping = mask_pii(text)
    assert "Maria Gonzalez" not in masked
    assert mapping["[CLIENT_1]"] == "Maria Gonzalez"


def test_product_name_after_reach_out_about_is_not_masked():
    """The false-positive risk this fix deliberately avoids: a product
    name should NOT be masked just because 'reach' appears nearby with
    other words in between."""
    text = "I wanted to reach out about the Balanced Growth Portfolio."
    masked, mapping = mask_pii(text)
    assert "Balanced Growth Portfolio" in masked
    assert mapping == {}


def test_documented_limitation_still_holds_for_other_verbs():
    """The original documented gap (no title, no contact-verb) is
    intentionally still not covered -- this fix is narrow, not a full
    NER solution, per the project's stated scope."""
    text = "Jane Smith called about a separate matter."
    masked, mapping = mask_pii(text)
    assert "Jane Smith" in masked
    assert mapping == {}
