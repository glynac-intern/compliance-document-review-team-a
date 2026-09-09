"""
Tests for TA-42's dimension guard: embed_text() must raise immediately
if the API ever returns a vector whose length disagrees with the
configured EMBEDDING_DIM -- this is the actual acceptance criterion
("the embedding dimension used at query time cannot silently disagree
with the stored vectors"), not just that a correct call succeeds.

Mocks the Gemini client response rather than hitting the real API --
deterministic, fast, and lets us construct the exact wrong-dimension
case that's hard to trigger for real.
"""
import sys
from unittest.mock import MagicMock, patch

sys.path.insert(0, "/app/data_pipeline/embeddings")

import embed_client
from embed_client import embed_text, EMBEDDING_DIM


def test_embed_text_raises_on_dimension_mismatch():
    wrong_length_vector = [0.1] * (EMBEDDING_DIM - 1)  # deliberately one short

    fake_response = MagicMock()
    fake_response.embeddings = [MagicMock(values=wrong_length_vector)]

    fake_client = MagicMock()
    fake_client.models.embed_content.return_value = fake_response

    with patch.object(embed_client, "get_client", return_value=fake_client):
        try:
            embed_text("some text")
            assert False, "expected embed_text to raise on dimension mismatch"
        except ValueError as e:
            assert "dimension mismatch" in str(e).lower()
            assert str(EMBEDDING_DIM) in str(e)


def test_embed_text_does_not_retry_on_dimension_mismatch():
    """A dimension mismatch is a config bug, not a transient error --
    confirm it fails on the FIRST attempt rather than retrying 3 times."""
    wrong_length_vector = [0.1] * (EMBEDDING_DIM - 1)

    fake_response = MagicMock()
    fake_response.embeddings = [MagicMock(values=wrong_length_vector)]

    fake_client = MagicMock()
    fake_client.models.embed_content.return_value = fake_response

    with patch.object(embed_client, "get_client", return_value=fake_client):
        try:
            embed_text("some text", retries=3)
        except ValueError:
            pass

    assert fake_client.models.embed_content.call_count == 1, (
        "dimension mismatch should fail immediately, not retry"
    )


def test_embed_text_succeeds_on_correct_dimension():
    correct_vector = [0.1] * EMBEDDING_DIM

    fake_response = MagicMock()
    fake_response.embeddings = [MagicMock(values=correct_vector)]

    fake_client = MagicMock()
    fake_client.models.embed_content.return_value = fake_response

    with patch.object(embed_client, "get_client", return_value=fake_client):
        result = embed_text("some text")

    assert len(result) == EMBEDDING_DIM
