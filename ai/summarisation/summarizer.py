from google.genai import types

GENERATION_MODEL = "gemini-3.5-flash-lite"

SUMMARY_PROMPT_TEMPLATE = """Summarize the following client-facing financial document for a compliance officer, in 2-3 sentences. Focus on: what type of document it is, its main purpose, and any notable performance figures or claims mentioned. Do not invent details not present in the text.

Document:
\"\"\"{text}\"\"\"

Summary:"""


def generate_summary(client, masked_text: str) -> str:
    prompt = SUMMARY_PROMPT_TEMPLATE.format(text=masked_text)
    import time
    for attempt in range(3):
        try:
            response = client.models.generate_content(
                model=GENERATION_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(temperature=0.2),
            )
            return response.text.strip()
        except Exception:
            if attempt == 2:
                raise
            time.sleep(2 ** attempt)
