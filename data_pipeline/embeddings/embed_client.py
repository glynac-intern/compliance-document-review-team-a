"""Shared embedding helper, used by embed_rules.py, disclosure_check.py,
and the analysis pipeline -- one place to change model/dimension/retry
behavior rather than three copies drifting apart."""

import os
import time

from google import genai
from google.genai import types

EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIM = 768

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
            return result.embeddings[0].values
        except Exception as e:
            if attempt == retries - 1:
                raise
            time.sleep(2 ** attempt)
