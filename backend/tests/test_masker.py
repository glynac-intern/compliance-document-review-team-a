"""
Unit tests for ai/masking/masker.py. Pure logic, no DB/API dependency --
fast and deterministic.
"""
import sys
sys.path.insert(0, "/app/ai/masking")

from masker import mask_pii, unmask_for_display


def test_email_is_masked():
    masked, mapping = mask_pii("Contact john@example.com for details.")
    assert "john@example.com" not in masked
    assert "[EMAIL_1]" in masked
    assert mapping["[EMAIL_1]"] == "john@example.com"


def test_phone_is_masked():
    masked, mapping = mask_pii("Call me at (555) 123-4567 today.")
    assert "(555) 123-4567" not in masked
    assert "[PHONE_1]" in masked


def test_ssn_is_masked():
    masked, mapping = mask_pii("SSN on file: 123-45-6789.")
    assert "123-45-6789" not in masked
    assert "[SSN_1]" in masked


def test_account_number_requires_keyword():
    masked, mapping = mask_pii("Your account #48291037 was reviewed.")
    assert "48291037" not in masked
    assert "[ACCOUNT_1]" in masked

    # A bare number with no "account"/"acct" keyword nearby should NOT be
    # masked -- documented limitation, avoids false-positiving on unrelated
    # long numbers (invoice numbers, dates, etc).
    masked2, mapping2 = mask_pii("Reference number 48291037 for your file.")
    assert "48291037" in masked2
    assert mapping2 == {}


def test_address_is_masked():
    masked, mapping = mask_pii("She lives at 742 Evergreen Terrace now.")
    assert "742 Evergreen Terrace" not in masked
    assert "[ADDRESS_1]" in masked


def test_name_masked_only_with_title():
    # Documented behavior: a title (Mr/Mrs/Ms/Dr, optionally with "Dear")
    # is REQUIRED to mask a name -- this is a known, documented limitation,
    # not a bug, so the test asserts the actual designed behavior.
    masked, mapping = mask_pii("Dear Mr. John Carter, thank you.")
    assert "John Carter" not in masked
    assert mapping["[CLIENT_1]"] == "John Carter"


def test_name_without_title_is_not_masked():
    # This is the documented gap: a name with no salutation nearby is
    # NOT caught. Asserting this protects against a future change
    # silently making the masker behave differently than documented.
    masked, mapping = mask_pii("Jane Smith called about a separate matter.")
    assert "Jane Smith" in masked
    assert mapping == {}


def test_amount_masked_only_in_same_paragraph_as_client():
    same_para = "Dear Mr. John Carter, your balance of $8,750.00 is due."
    masked, mapping = mask_pii(same_para)
    assert "$8,750.00" not in masked
    assert "[AMOUNT_1]" in masked

    different_para = "Dear Mr. John Carter,\n\nYour balance of $8,750.00 is due."
    masked2, mapping2 = mask_pii(different_para)
    # Different paragraph -- documented limitation, amount stays unmasked
    assert "$8,750.00" in masked2


def test_unmask_for_display_restores_original_values():
    original = "Dear Mr. John Carter, contact us at john@example.com."
    masked, mapping = mask_pii(original)
    restored = unmask_for_display(masked, mapping)
    assert restored == original


def test_mapping_never_leaks_into_masked_text():
    """The whole point of masking: none of the real values should appear
    in the text that would be sent to the LLM vendor."""
    text = (
        "Dear Mr. John Carter, contact john@example.com or (555) 123-4567. "
        "Your account #48291037 shows SSN 123-45-6789 at 742 Evergreen Terrace."
    )
    masked, mapping = mask_pii(text)
    for original_value in mapping.values():
        assert original_value not in masked
