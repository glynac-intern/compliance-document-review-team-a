"""
Generates the seed corpus of ~100 sample compliance documents for the
Compliance Document Review App, per the brief's guidance that generating
this with a script/LLM is expected (budget ~half a day).

All content is fictional. No real client data is used anywhere.

Usage:
    python3 generate_documents.py

Outputs:
    seed/documents/doc_001.txt ... doc_100.txt
    seed/documents/metadata.json  (tracks injected issues per document,
                                    for evaluating retrieval/flag quality)
"""

import json
import random
from pathlib import Path

random.seed(42)  # reproducible corpus across runs

OUTPUT_DIR = Path(__file__).parent / "documents"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

ADVISOR_NAMES = [
    "Rachel Kim", "Marcus Bell", "Priya Anand", "Tom Whitfield", "Sofia Reyes",
    "David Chen", "Angela Foster", "James Okafor", "Nina Petrov", "Chris Dalton",
]

CLIENT_NAMES = [
    "John Carter", "Linda Park", "Robert Hayes", "Maria Gonzalez", "Kevin Lu",
    "Susan Bright", "Michael Torres", "Emily Novak", "George Patel", "Diane Ross",
]

PRODUCTS = [
    "the Balanced Growth Portfolio", "our Retirement Income Strategy",
    "the Tax-Advantaged Bond Fund", "our Managed ETF Program",
    "the Legacy Wealth Plan", "our Dividend Focus Strategy",
]

REQUIRED_DISCLOSURE = (
    "Past performance is not indicative of future results. All investments "
    "involve risk, including the possible loss of principal."
)

PROHIBITED_CLAIMS = [
    "This strategy guarantees a steady return with no downside risk.",
    "Our approach always outperforms the market, year after year.",
    "This is a no-risk opportunity only available to my personal clients.",
    "Act now — this rate is only available for a limited time.",
]

PERFORMANCE_VIOLATIONS = [
    "The portfolio returned 18% last year.",  # no time-period/gross-net spec
    "Average annual return has been 12% over the past decade.",  # no methodology
]

COMPLIANT_PERFORMANCE = (
    "The portfolio returned 9.2% (net of fees) for the trailing twelve months "
    "ending June 30, 2026, compared to 7.8% for its benchmark index."
)


def _client_and_advisor():
    return random.choice(CLIENT_NAMES), random.choice(ADVISOR_NAMES)


def _maybe_pii_block(client_name):
    """Returns a block of fake PII text tied to the client, for masker testing."""
    first = client_name.split()[0].lower()
    email = f"{first}.{random.randint(100,999)}@example.com"
    phone = f"({random.randint(200,999)}) {random.randint(200,999)}-{random.randint(1000,9999)}"
    return f"You can reach {client_name} at {email} or {phone}. Account #{random.randint(10000000,99999999)}."


def gen_marketing_email(include_disclosure, include_claim, perf_style):
    client, advisor = _client_and_advisor()
    product = random.choice(PRODUCTS)
    body = f"Dear Mr. {client},\n\n"
    body += f"I wanted to reach out about {product}, which may be a good fit for your goals.\n\n"
    if perf_style == "violation":
        body += random.choice(PERFORMANCE_VIOLATIONS) + "\n\n"
    elif perf_style == "compliant":
        body += COMPLIANT_PERFORMANCE + "\n\n"
    if include_claim:
        body += random.choice(PROHIBITED_CLAIMS) + "\n\n"
    body += "Let me know if you'd like to schedule a call to discuss further.\n\n"
    body += f"Best regards,\n{advisor}\n"
    if include_disclosure:
        body += f"\n{REQUIRED_DISCLOSURE}\n"
    return body


def gen_brochure(include_disclosure, include_claim, perf_style):
    product = random.choice(PRODUCTS)
    body = f"{product.upper()}\n\n"
    body += "Overview:\nA diversified strategy designed for long-term investors seeking steady growth.\n\n"
    if perf_style == "violation":
        body += "Performance:\n" + random.choice(PERFORMANCE_VIOLATIONS) + "\n\n"
    elif perf_style == "compliant":
        body += "Performance:\n" + COMPLIANT_PERFORMANCE + "\n\n"
    if include_claim:
        body += random.choice(PROHIBITED_CLAIMS) + "\n\n"
    body += "Contact your advisor to learn more about how this strategy fits your portfolio.\n"
    if include_disclosure:
        body += f"\n{REQUIRED_DISCLOSURE}\n"
    return body


def gen_social_post(include_disclosure, include_claim, perf_style):
    _, advisor = _client_and_advisor()
    body = f"[Social Media Post by {advisor}]\n\n"
    if perf_style == "violation":
        body += random.choice(PERFORMANCE_VIOLATIONS) + " 📈\n\n"
    elif perf_style == "compliant":
        body += COMPLIANT_PERFORMANCE + "\n\n"
    if include_claim:
        body += random.choice(PROHIBITED_CLAIMS) + "\n\n"
    body += "DM me to learn how I can help you plan for retirement!\n"
    if include_disclosure:
        body += f"\n{REQUIRED_DISCLOSURE}\n"
    return body


def gen_meeting_notes(include_disclosure, include_claim, perf_style, with_pii):
    client, advisor = _client_and_advisor()
    body = f"Meeting Notes — Client Review\nAdvisor: {advisor}\nClient: {client}\n\n"
    body += "Discussion:\nReviewed current allocation and discussed risk tolerance. "
    body += "Client indicated a moderate risk tolerance and a 15-year time horizon.\n\n"
    if perf_style == "violation":
        body += random.choice(PERFORMANCE_VIOLATIONS) + "\n\n"
    elif perf_style == "compliant":
        body += COMPLIANT_PERFORMANCE + "\n\n"
    if include_claim:
        body += random.choice(PROHIBITED_CLAIMS) + "\n\n"
    if with_pii:
        body += _maybe_pii_block(client) + "\n\n"
    body += "Next steps: Follow up in Q3 to reassess allocation.\n"
    if include_disclosure:
        body += "\nNote: Client's investment objectives and risk tolerance are on file per compliance requirements.\n"
    return body


def gen_proposal_letter(include_disclosure, include_claim, perf_style, with_pii):
    client, advisor = _client_and_advisor()
    product = random.choice(PRODUCTS)
    body = f"Dear Mrs. {client},\n\n"
    body += f"Thank you for meeting with me. Based on our discussion, I am proposing {product} "
    body += "for your consideration.\n\n"
    if perf_style == "violation":
        body += random.choice(PERFORMANCE_VIOLATIONS) + "\n\n"
    elif perf_style == "compliant":
        body += COMPLIANT_PERFORMANCE + "\n\n"
    if include_claim:
        body += random.choice(PROHIBITED_CLAIMS) + "\n\n"
    if with_pii:
        body += _maybe_pii_block(client) + "\n\n"
    body += "Please review the enclosed materials and let me know if you have questions.\n\n"
    body += f"Sincerely,\n{advisor}\n"
    if include_disclosure:
        body += f"\n{REQUIRED_DISCLOSURE}\nThis proposal is not a binding offer and is subject to change without notice.\n"
    return body


GENERATORS = {
    "marketing_email": gen_marketing_email,
    "brochure": gen_brochure,
    "social_post": gen_social_post,
    "meeting_notes": gen_meeting_notes,
    "proposal_letter": gen_proposal_letter,
}


def generate_corpus(n=100):
    metadata = []
    doc_types = list(GENERATORS.keys())

    for i in range(1, n + 1):
        doc_type = doc_types[i % len(doc_types)]
        # Distribution: ~40% fully compliant, ~60% with at least one issue
        include_disclosure = random.random() > 0.35
        include_claim = random.random() < 0.25
        perf_style = random.choices(
            ["none", "compliant", "violation"], weights=[0.3, 0.4, 0.3]
        )[0]
        with_pii = random.random() < 0.4

        generator = GENERATORS[doc_type]
        if doc_type in ("meeting_notes", "proposal_letter"):
            text = generator(include_disclosure, include_claim, perf_style, with_pii)
        else:
            text = generator(include_disclosure, include_claim, perf_style)
            with_pii = False  # these templates don't inject PII

        filename = f"doc_{i:03d}.txt"
        (OUTPUT_DIR / filename).write_text(text, encoding="utf-8")

        issues = []
        if not include_disclosure:
            issues.append("missing_required_disclosure")
        if include_claim:
            issues.append("prohibited_claim")
        if perf_style == "violation":
            issues.append("performance_standard_violation")

        metadata.append({
            "filename": filename,
            "type": doc_type,
            "injected_issues": issues,
            "is_clean": len(issues) == 0,
            "contains_pii": with_pii,
        })

    (OUTPUT_DIR / "metadata.json").write_text(
        json.dumps(metadata, indent=2), encoding="utf-8"
    )
    return metadata


if __name__ == "__main__":
    metadata = generate_corpus(100)
    clean = sum(1 for m in metadata if m["is_clean"])
    with_pii = sum(1 for m in metadata if m["contains_pii"])
    print(f"Generated {len(metadata)} documents")
    print(f"  Clean (no issues): {clean}")
    print(f"  With at least one issue: {len(metadata) - clean}")
    print(f"  Containing PII: {with_pii}")
    print(f"  Types: {set(m['type'] for m in metadata)}")
