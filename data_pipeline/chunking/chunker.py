import re


def chunk_paragraphs(text: str) -> list[str]:
    """Splits on blank lines, drops empty/whitespace-only chunks."""
    chunks = re.split(r"\n\s*\n", text)
    return [c.strip() for c in chunks if c.strip()]
