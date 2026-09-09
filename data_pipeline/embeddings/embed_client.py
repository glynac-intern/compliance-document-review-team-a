"""Shared embedding helper, used by embed_rules.py, disclosure_check.py,
and the analysis pipeline -- one place to change model/dimension/retry
behavior rather than three copies drifting apart.

Model name and dimension come from model_config.py (single source of
truth, TA-42) -- not hardcoded here.

Enforces (TA-34): text is NEVER sent to the embedding API while it still
contains raw PII. This is checked in code, not assumed by convention --
see _guard_no_raw_pii below."""

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
    something to mask, it proves raw PII reached this call in error --
    embeddings are an API call too, and must never leak what masking was
    there to prevent.
    """
    _, mapping = mask_pii(text)
    if mapping:
        raise ValueError(
            f"Refusing to embed text that still contains unmasked PII "
            f"({len(mapping)} pattern(s) matched: {sorted(mapping.keys())}). "
            f"Call mask_pii() on this text before embedding it."
        )


def embed_text(text: str, retries: int = 3) -> list[float]:
    _guard_no_raw_pii(text)

    client = get_client()
    for attempt in range(retries):
        try:
            result = client.models.embed_content(
                model=EMBEDDING_MODEL,
                contents=text,
                config=types.EmbedContentConfig(output_dimensionality=EMBEDDING_DIM),
            )
            vector = result.embeddings[0].values
            if len(vector) != EMBEDDING_DIM:
                raise ValueError(
                    f"Embedding dimension mismatch: API returned {len(vector)} "
                    f"dimensions, but EMBEDDING_DIM is configured as {EMBEDDING_DIM}. "
                    f"Check model_config.py / EMBEDDING_DIM env var against the "
                    f"actual model's output."
                )
            return vector
        except ValueError:
            raise  # dimension mismatch / PII guard -- not transient, don't retry
        except Exception as e:
            if attempt == retries - 1:
                raise
            time.sleep(2 ** attempt)
