"""Shared embedding helper, used by embed_rules.py, disclosure_check.py,
and the analysis pipeline -- one place to change model/dimension/retry
behavior rather than three copies drifting apart.

Model name and dimension come from model_config.py (single source of
truth, TA-42) -- not hardcoded here."""

import os
import time

from google import genai
from google.genai import types

from model_config import EMBEDDING_MODEL, EMBEDDING_DIM

_client = None


def get_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=os.environ["LLM_API_KEY"])
    return _client


def embed_text(text: str, retries: int = 3) -> list[float]:
    client = get_client()
    for attempt in range(retries):
        try:
            result = client.models.embed_content(
                model=EMBEDDING_MODEL,
                contents=text,
                config=types.EmbedContentConfig(output_dimensionality=EMBEDDING_DIM),
            )
            vector = result.embeddings[0].values
            # Guard against the embedding dimension silently disagreeing
            # with what the stored vectors (and the DB column) expect --
            # e.g. if EMBEDDING_DIM gets changed in one place but not the
            # actual API response. Fail loudly here rather than let a
            # mismatched vector reach pgvector and fail (or worse, not
            # fail) at insert time with a confusing error.
            if len(vector) != EMBEDDING_DIM:
                raise ValueError(
                    f"Embedding dimension mismatch: API returned {len(vector)} "
                    f"dimensions, but EMBEDDING_DIM is configured as {EMBEDDING_DIM}. "
                    f"Check model_config.py / EMBEDDING_DIM env var against the "
                    f"actual model's output."
                )
            return vector
        except ValueError:
            raise  # dimension mismatch is not a transient error -- don't retry
        except Exception as e:
            if attempt == retries - 1:
                raise
            time.sleep(2 ** attempt)
