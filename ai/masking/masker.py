"""
PII masker for the Compliance Document Review App.

Regex-and-heuristics based, per the project brief's explicit guidance:
production-grade PII detection is out of scope. This masks the common,
reliably-detectable entity types before any text leaves the app for the
LLM vendor. See KNOWN_LIMITATIONS at the bottom for what this does NOT
catch — that honesty is part of the expected deliverable, not a gap to
hide.

Usage:
    masked_text, mapping = mask_pii(original_text)
    # ... send masked_text to the LLM vendor ...
    # ... LLM returns some analysis referencing placeholders ...
    display_text = unmask_for_display(llm_output, mapping)
"""

import re
from collections import defaultdict

EMAIL_RE = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")

PHONE_RE = re.compile(
    r"(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b"
)

SSN_RE = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")

ACCOUNT_RE = re.compile(
    r"\b(?:account|acct)\.?\s*#?\s*:?\s*(\d{6,17})\b", re.IGNORECASE
)

STREET_SUFFIXES = r"(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Place|Pl|Terrace|Ter|Circle|Cir)\.?"
ADDRESS_RE = re.compile(
    rf"\b\d{{1,5}}\s+(?:[A-Z][a-z]+\s){{1,3}}{STREET_SUFFIXES}\b"
)

# "Dear" is an optional greeting prefix; Mr/Mrs/Ms/Dr is the REQUIRED title
# that anchors the capture group onto the actual name, not onto another
# title word. Without the mandatory title, "Dear John," alone won't match —
# documented tradeoff below.
NAME_RE = re.compile(
    r"\b(?:Dear\s+)?(?:Mr|Mrs|Ms|Dr)\.?\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})\b"
)

# TA-49 addition: names following a contact-verb ("reach", "contact",
# "call") -- e.g. "You can reach Maria Gonzalez at...". Deliberately
# narrow: does NOT match generic capitalized two-word phrases, since
# these documents also contain product names ("Balanced Growth
# Portfolio", "Legacy Wealth Plan") that must NOT be masked as if they
# were people. "reach/contact/call" is specific enough that it doesn't
# collide with product-name mentions in practice.
CONTACT_VERB_NAME_RE = re.compile(
    r"\b(?:reach|contact|call)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})\b"
)

AMOUNT_RE = re.compile(r"\$\s?[\d,]+(?:\.\d{2})?")


def mask_pii(text: str) -> tuple[str, dict[str, str]]:
    """
    Returns (masked_text, mapping) where mapping is placeholder -> original
    value. Mapping must stay server-side and never be sent to the vendor.
    """
    mapping: dict[str, str] = {}
    counters: dict[str, int] = defaultdict(int)

    def _replace(pattern: re.Pattern, label: str, text_in: str, group: int = 0) -> str:
        def _sub(match: re.Match) -> str:
            counters[label] += 1
            value = match.group(group) if group else match.group(0)
            placeholder = f"[{label}_{counters[label]}]"
            mapping[placeholder] = value
            if group:
                # Only swap the captured value within the full match --
                # preserves surrounding literal text (e.g. "Dear Mr. ",
                # "account #") so unmask_for_display can restore the
                # ORIGINAL text exactly, not just the extracted value.
                full_match = match.group(0)
                return full_match.replace(value, placeholder, 1)
            return placeholder
        return pattern.sub(_sub, text_in)

    masked = text
    masked = _replace(EMAIL_RE, "EMAIL", masked)
    masked = _replace(PHONE_RE, "PHONE", masked)
    masked = _replace(SSN_RE, "SSN", masked)
    masked = _replace(ACCOUNT_RE, "ACCOUNT", masked, group=1)
    masked = _replace(ADDRESS_RE, "ADDRESS", masked)
    masked = _replace(NAME_RE, "CLIENT", masked, group=1)
    masked = _replace(CONTACT_VERB_NAME_RE, "CLIENT", masked, group=1)

    # Dollar amounts "tied to a named person": paragraph-based proximity —
    # if a $ amount appears in the same paragraph (blank-line-delimited
    # block) as a [CLIENT_n] placeholder, tag it with that client. This is
    # more robust than a fixed character window against varying sentence
    # lengths. Amounts in a paragraph with no client mention are left
    # unmasked (e.g. a general fee schedule).
    paragraphs = re.split(r"(\n\s*\n)", masked)  # keep separators for reassembly
    for i, para in enumerate(paragraphs):
        client_matches = re.findall(r"\[CLIENT_(\d+)\]", para)
        if not client_matches:
            continue

        def _sub_amount(match: re.Match) -> str:
            counters["AMOUNT"] += 1
            placeholder = f"[AMOUNT_{counters['AMOUNT']}]"
            mapping[placeholder] = match.group(0)
            return placeholder

        paragraphs[i] = AMOUNT_RE.sub(_sub_amount, para)
    masked = "".join(paragraphs)

    return masked, mapping


def unmask_for_display(text: str, mapping: dict[str, str]) -> str:
    """
    Replaces placeholders in LLM-returned text with original values, for
    display to the officer only. Never send the result of this function
    to the vendor.
    """
    result = text
    for placeholder, original in mapping.items():
        result = result.replace(placeholder, original)
    return result


# --- KNOWN LIMITATIONS (honest, not exhaustive) ---
# - Names: only detected when preceded by Mr./Mrs./Ms./Dr. (optionally
#   with a leading "Dear"). A bare "Dear John," with no title, or a name
#   appearing mid-sentence with no salutation ("Jane Smith called..."),
#   will NOT be masked.
# - Addresses: standard "number + street name + suffix" patterns only
#   (Street, Ave, Road, Terrace, Circle, etc.). PO boxes, apartment/unit
#   numbers, and non-US formats are not covered.
# - Account numbers: require the literal word "account"/"acct" nearby.
#   A bare number with no label will not be masked, to avoid
#   false-positiving on invoice numbers, dates, etc.
# - Dollar amounts: masked only when a client placeholder appears in the
#   same paragraph (blank-line-delimited block). An amount in its own
#   paragraph, or referencing a client from several paragraphs earlier,
#   may be missed.
# - No handling for nicknames, initials-only names ("J. Smith"), or
#   names split across a line break.
