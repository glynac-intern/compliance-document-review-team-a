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

# TA-88: (?<!\d)...(?!\d), not \b on both ends -- \b treats underscore
# as a word character, so it silently fails to match an SSN directly
# adjacent to one (e.g. "statement_123-45-6789_final.pdf"), found via
# an adversarial filename-shaped-text test. The lookarounds specifically
# reject being preceded/followed by another DIGIT (still won't
# partial-match inside a longer run like "1234-56-78901"), while
# allowing underscores, letters, or punctuation on either side.
SSN_RE = re.compile(r"(?<!\d)\d{3}-\d{2}-\d{4}(?!\d)")

ACCOUNT_RE = re.compile(
    r"\b(?:account|acct)\.?\s*#?\s*:?\s*(\d{6,17})\b", re.IGNORECASE
)

STREET_SUFFIXES = r"(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Place|Pl|Terrace|Ter|Circle|Cir)\.?"
ADDRESS_RE = re.compile(
    rf"\b\d{{1,5}}\s+(?:[A-Z][a-z]+\s){{1,3}}{STREET_SUFFIXES}\b"
)

# TA-88: each name word requires an uppercase FIRST letter -- covering
# ASCII (A-Z) and the Latin-1/Latin Extended-A accented uppercase range
# (À-Ö, Ø-Þ, e.g. É Ñ Ü) -- followed by any run of Unicode letters for
# the rest of the word (covers lowercase accented letters too, e.g. é
# ü ç, wherever they fall in the word). The original [A-Z][a-z]+ was
# ASCII-only and silently mangled "Dr. José García" (partial-matched
# "Jos", dropped "é García" unmasked); simply switching the whole word
# to a permissive [^\W\d_]+ (tried first, reverted) broke the mandatory
# capital-first-letter signal that stops the two-word repetition group
# at the next lowercase connector word -- confirmed via regression:
# "reach Maria Gonzalez at maria@..." then captured "Maria Gonzalez at"
# as the name, "at" included. Requiring a capitalized first letter
# (now Unicode-aware, not ASCII-only) keeps that stopping behavior
# while still matching accented names.
NAME_WORD = r"[A-ZÀ-ÖØ-Þ][^\W\d_]*"

# "Dear" is an optional greeting prefix; Mr/Mrs/Ms/Dr is the REQUIRED title
# that anchors the capture group onto the actual name, not onto another
# title word. Without the mandatory title, "Dear John," alone won't match —
# documented tradeoff below.
NAME_RE = re.compile(
    rf"\b(?:Dear\s+)?(?:Mr|Mrs|Ms|Dr)\.?\s+({NAME_WORD}(?:\s{NAME_WORD}){{0,2}})\b",
    re.UNICODE,
)

# TA-49 addition: names following a contact-verb ("reach", "contact",
# "call") -- e.g. "You can reach Maria Gonzalez at...". Deliberately
# narrow: does NOT match generic capitalized two-word phrases, since
# these documents also contain product names ("Balanced Growth
# Portfolio", "Legacy Wealth Plan") that must NOT be masked as if they
# were people. "reach/contact/call" is specific enough that it doesn't
# collide with product-name mentions in practice.
CONTACT_VERB_NAME_RE = re.compile(
    rf"\b(?:reach|contact|call)\s+({NAME_WORD}(?:\s{NAME_WORD}){{0,2}})\b",
    re.UNICODE,
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
#   will NOT be masked. This is the single biggest real-world exposure
#   path in the app: a client-supplied FILENAME carrying a name (e.g.
#   "John_Smith_portfolio_review.pdf") is never masked at all, anywhere
#   -- filenames are never passed through mask_pii in the first place,
#   only extracted document TEXT is. Confirmed via TA-88's adversarial
#   pass (test_ta88_masker_adversarial.py); not fixed here, since doing
#   so touches how filenames are stored/displayed across every viewer,
#   a larger and riskier change than this pass's scope.
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
# - No handling for nicknames, initials-only names ("J. Smith").
# - TA-88 adversarial pass, confirmed by running mask_pii() directly
#   against each of these (test_ta88_masker_adversarial.py), not just
#   assumed:
#   - Unicode names (accented/non-ASCII characters, e.g. "José García")
#     ARE now masked -- found broken (silently partial-matched, leaking
#     everything past the first non-ASCII character) and fixed in this
#     same pass by widening NAME_RE/CONTACT_VERB_NAME_RE to match any
#     Unicode letter instead of the ASCII-only [A-Z][a-z].
#   - PII split across a line break (an email or SSN broken mid-token
#     by a line wrap, which real extracted PDF/DOCX text does at
#     arbitrary points) is NOT masked -- none of the regexes tolerate
#     embedded whitespace/newlines within a match. Not fixed: joining
#     wrapped lines before masking is an extraction-stage change, out
#     of scope for the masker itself.
#   - SSN without dashes (a bare 9-digit run) is NOT masked -- SSN_RE
#     requires the dashed shape as its anchor; a bare 9-digit number is
#     otherwise indistinguishable from an account/reference number.
#     Deliberate precision/recall tradeoff, not an oversight.
#   - Non-US phone formats (e.g. "+44 20 7946 0958") and extensions
#     ("x4521") are NOT masked/stripped -- PHONE_RE is US-format-only.
#   - PII embedded in filename-shaped text (underscores/hyphens instead
#     of spaces, no sentence structure) is masked for SSN/email. SSN was
#     actually broken here until this same pass: SSN_RE used \b on both
#     ends, and \b treats underscore as a word character, so a
#     directly-adjacent SSN ("statement_123-45-6789_final.pdf") silently
#     never matched -- found via this exact adversarial case, fixed by
#     switching to digit-specific negative lookarounds instead of \b.
#     Names in this same filename shape are NOT masked, per the filename
#     point above (no title to anchor on).
