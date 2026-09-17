"""
Answers an officer's ad-hoc question about a document during review
(TA-103). Previously the /chat backend route this is meant to serve
didn't exist at all, so every question silently fell through to the
frontend's local fallback -- which only pattern-matched a handful of
keywords and otherwise returned fixed FINRA/SEC boilerplate regardless
of what was actually asked.

Grounds the model in the document's own (masked) text plus its existing
summary/flags, and instructs it to answer the SPECIFIC question rather
than default to generic regulatory language.
"""
import json
import time

from google.genai import types

from data_pipeline.embeddings.model_config import GENERATION_MODEL, CHAT_GENERATION_TEMPERATURE

CHAT_PROMPT_TEMPLATE = """You are Verity AI, a compliance assistant helping a compliance officer review a client-facing financial document. You have already analyzed this document; here is what you found.

Document title: {title}

Summary:
{summary}

Compliance flags ({flag_count}):
{flags_block}

Document text (PII has been replaced with placeholders like [CLIENT_1]):
\"\"\"{document_text}\"\"\"

{history_block}Officer's question: "{query}"

Answer the officer's question directly and specifically, using the document above. Only discuss regulations if the question is actually about them -- do not default to generic FINRA/SEC boilerplate when asked something else (e.g. a factual question about the document itself). If a short suggested decision note for this document would genuinely help, include one; otherwise use null.

Respond ONLY with a JSON object in this exact format:
{{"reply": "<direct answer to the officer, plain text>", "suggested_decision_note": "<short decision note>" or null}}
"""


def _format_flags_block(flags: list[dict]) -> str:
    if not flags:
        return "(No flags -- no compliance issues detected.)"
    return "\n".join(
        f"- [{f['severity'].upper()}] {f.get('rule_id') or 'Flag'}: {f['explanation']}"
        for f in flags
    )


def _format_history_block(history: list[dict]) -> str:
    if not history:
        return ""
    lines = "\n".join(f"{h['role']}: {h['content']}" for h in history)
    return f"Conversation so far:\n{lines}\n\n"


def generate_chat_reply(
    client,
    query: str,
    history: list[dict],
    document_text: str,
    title: str | None,
    summary: str | None,
    flags: list[dict],
) -> dict:
    """
    Returns {"reply": str, "suggested_decision_note": str | None}. Raises
    on a real LLM failure (network/outage/auth) after 3 attempts -- the
    caller (the /chat route) converts that into a 503, same pattern as
    document analysis (TA-87), rather than silently returning boilerplate.
    """
    prompt = CHAT_PROMPT_TEMPLATE.format(
        title=title or "Untitled document",
        summary=summary or "(No summary available.)",
        flag_count=len(flags),
        flags_block=_format_flags_block(flags),
        document_text=document_text[:12000] or "(No extracted text available.)",
        history_block=_format_history_block(history),
        query=query,
    )

    for attempt in range(3):
        try:
            response = client.models.generate_content(
                model=GENERATION_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=CHAT_GENERATION_TEMPERATURE,
                ),
            )
            break
        except Exception:
            if attempt == 2:
                raise
            time.sleep(2 ** attempt)

    try:
        parsed = json.loads(response.text)
        reply = (parsed.get("reply") or "").strip()
        suggested_decision_note = parsed.get("suggested_decision_note") or None
        if not reply:
            raise ValueError("empty reply")
    except (json.JSONDecodeError, TypeError, ValueError, AttributeError):
        # Model didn't return valid JSON -- unlike flag parsing (which can
        # safely drop to []), a chat reply has no safe empty default, so
        # fall back to the raw text rather than losing the answer.
        reply = response.text.strip()
        suggested_decision_note = None

    return {"reply": reply, "suggested_decision_note": suggested_decision_note}
