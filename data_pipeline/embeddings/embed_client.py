"""Shared embedding helper, used by embed_rules.py, disclosure_check.py,
and the analysis pipeline -- one place to change model/dimension/retry
behavior rather than three copies drifting apart.

Model name and dimension come from model_config.py (single source of
truth, TA-42) -- not hardcoded here.

Enforces (TA-34): text is NEVER sent to the embedding API while it still
contains raw PII.

Batches (TA-52): embed_texts_batch() sends multiple strings in ONE API
call instead of one round trip per string -- embed_text() is a thin
single-item wrapper around it, so there is exactly one real
implementation, not two to keep in sync."""

import os
import sys
import time

from google import genai
from google.genai import types

from model_config import EMBEDDING_MODEL, EMBEDDING_DIM

sys.path.insert(0, "/app/ai/masking")
from masker import mask_pii

_client = None


def get_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=os.environ["LLM_API_KEY"])
    return _client


def _guard_no_raw_pii(text: str) -> None:
    """
    Refuses text that still contains anything the masker would catch.
    Properly-masked text (placeholders like [EMAIL_1], [CLIENT_1]) never
    matches the masker's own patterns again, so if THIS check finds
    something to mask, it proves raw PII reached this call in error.
    """
    _, mapping = mask_pii(text)
    if mapping:
        raise ValueError(
            f"Refusing to embed text that still contains unmasked PII "
            f"({len(mapping)} pattern(s) matched: {sorted(mapping.keys())}). "
            f"Call mask_pii() on this text before embedding it."
        )


def embed_texts_batch(texts: list[str], retries: int = 3) -> list[list[float]]:
    """
    Embeds MULTIPLE strings in a single API call. Returns one vector per
    input string, in the same order. Every string is guarded against raw
    PII before the batch is sent -- one bad string blocks the whole
    batch rather than silently skipping it.
    """
    if not texts:
        return []

    for text in texts:
        _guard_no_raw_pii(text)

    client = get_client()
    for attempt in range(retries):
        try:
            result = client.models.embed_content(
                model=EMBEDDING_MODEL,
                contents=texts,
                config=types.EmbedContentConfig(output_dimensionality=EMBEDDING_DIM),
            )
            vectors = [e.values for e in result.embeddings]
            for v in vectors:
                if len(v) != EMBEDDING_DIM:
                    raise ValueError(
                        f"Embedding dimension mismatch: API returned {len(v)} "
                        f"dimensions, but EMBEDDING_DIM is configured as {EMBEDDING_DIM}."
                    )
            return vectors
        except ValueError:
            raise  # dimension mismatch / PII guard -- not transient, don't retry
        except Exception as e:
            if attempt == retries - 1:
                raise
            time.sleep(2 ** attempt)


def embed_text(text: str, retries: int = 3) -> list[float]:
    """Single-item convenience wrapper around embed_texts_batch."""
    return embed_texts_batch([text], retries=retries)[0]
