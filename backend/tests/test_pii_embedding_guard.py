"""
Tests for TA-34: the embedding client must never be called with text
containing unmasked PII -- enforced in code (embed_client._guard_no_raw_pii),
not just by convention.

Mocks the underlying API client rather than making real calls -- lets us
assert the API was NEVER REACHED when PII is present, which is the real
proof of the invariant (not just "an exception happened somewhere").

If the guard is ever removed or bypassed, test_raw_pii_never_reaches_the_api
below will fail, since the mocked API would then actually get called.
"""
from unittest.mock import MagicMock, patch
import pytest

pytestmark = pytest.mark.unit


import data_pipeline.embeddings.embed_client as embed_client
from data_pipeline.embeddings.embed_client import embed_text, EMBEDDING_DIM


def _fake_client_returning(vector):
    fake_response = MagicMock()
    fake_response.embeddings = [MagicMock(values=vector)]
    fake_client = MagicMock()
    fake_client.models.embed_content.return_value = fake_response
    return fake_client


def test_raw_pii_never_reaches_the_api():
    """The core invariant: if text contains real PII, the embedding API
    must never be called at all -- not called-then-caught, never called."""
    fake_client = _fake_client_returning([0.1] * EMBEDDING_DIM)

    with patch.object(embed_client, "get_client", return_value=fake_client):
        try:
            embed_text("Contact john.carter@example.com for details.")
            assert False, "expected embed_text to raise before calling the API"
        except ValueError as e:
            assert "unmasked pii" in str(e).lower()

    assert fake_client.models.embed_content.call_count == 0, (
        "the embedding API was called despite raw PII in the input -- "
        "this is exactly the regression this test exists to catch"
    )


def test_properly_masked_text_is_allowed():
    """Placeholders like [EMAIL_1] never match the masker's own patterns
    again, so masked text must pass through and reach the API normally."""
    fake_client = _fake_client_returning([0.1] * EMBEDDING_DIM)

    with patch.object(embed_client, "get_client", return_value=fake_client):
        result = embed_text("Contact [EMAIL_1] for details, per [CLIENT_1]'s request.")

    assert len(result) == EMBEDDING_DIM
    assert fake_client.models.embed_content.call_count == 1


def test_clean_text_with_no_pii_is_allowed():
    """A plain compliance rule (the rules-corpus path) has no PII at all
    and must not be blocked."""
    fake_client = _fake_client_returning([0.1] * EMBEDDING_DIM)

    with patch.object(embed_client, "get_client", return_value=fake_client):
        result = embed_text(
            "Advisors may not state or imply a guaranteed rate of return."
        )

    assert len(result) == EMBEDDING_DIM
    assert fake_client.models.embed_content.call_count == 1


def test_rules_corpus_script_uses_the_same_guarded_embed_text():
    """Structural check: embed_rules.py must import the shared, guarded
    function (now the batch version, TA-52) -- not maintain its own
    separate copy that could bypass the guard. This is what makes the
    rules-corpus path covered as well as the document path."""
    import data_pipeline.embeddings.embed_rules as embed_rules
    assert embed_rules.embed_texts_batch is embed_client.embed_texts_batch


def test_disclosure_check_script_uses_the_same_guarded_embed_text():
    import data_pipeline.retrieval.disclosure_check as disclosure_check
    assert disclosure_check.embed_texts_batch is embed_client.embed_texts_batch
