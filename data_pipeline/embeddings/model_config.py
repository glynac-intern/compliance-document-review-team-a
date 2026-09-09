"""
Single source of truth for LLM model names, embedding dimensions, and
generation settings. Every module that calls Gemini (embeddings, flag
generation, summarization) reads from here instead of hardcoding its
own copy -- see TA-42.

All values are overridable via environment variables (documented in
.env.example) so CI, a developer's machine, and production can differ
without editing source.
"""
import os

# --- Embeddings ---
EMBEDDING_MODEL = os.environ.get("EMBEDDING_MODEL", "gemini-embedding-001")
EMBEDDING_DIM = int(os.environ.get("EMBEDDING_DIM", "768"))

# --- Generation (flagging + summarization) ---
GENERATION_MODEL = os.environ.get("GENERATION_MODEL", "gemini-3.5-flash-lite")
FLAG_GENERATION_TEMPERATURE = float(os.environ.get("FLAG_GENERATION_TEMPERATURE", "0.1"))
SUMMARY_GENERATION_TEMPERATURE = float(os.environ.get("SUMMARY_GENERATION_TEMPERATURE", "0.2"))
