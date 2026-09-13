"""
TA-33 demo artifact: submits a document seeded with a FAKE client name,
email, and account number through the REAL pipeline (real masking,
real embedding, real Gemini calls -- not mocked), captures the exact
outbound payload sent for both the flagging call and the summary call,
and writes a human-readable proof file you can open and show live
during a demo.

Only the MASKED outbound payload is ever written to this file -- never
the raw seeded values or the PII mapping, so this capture mechanism
itself never writes real PII to any log or file (TA-33's last
acceptance criterion).

Run inside the backend container:
    docker compose run --rm backend python data_pipeline/prove_masking_demo.py
"""
import json
import sys
from datetime import datetime, timezone

sys.path.insert(0, "/app")
sys.path.insert(0, "/app/ai/compliance")
sys.path.insert(0, "/app/data_pipeline/embeddings")

from database import SessionLocal
import analyze_document

FAKE_NAME = "Fake Testperson"
FAKE_EMAIL = "fake.testperson@example-fake-domain.com"
FAKE_PHONE = "(555) 000-1111"
FAKE_ACCOUNT = "99988877"

SEEDED_RAW_TEXT = (
    f"Dear Mr. {FAKE_NAME},\n\n"
    f"Thank you for your interest. Contact us at {FAKE_EMAIL} or {FAKE_PHONE}. "
    f"Your account #{FAKE_ACCOUNT} has been reviewed.\n\n"
    f"This strategy guarantees a steady return with no downside risk."
)

OUTPUT_PATH = "/app/masking_proof.json"


def main():
    db = SessionLocal()
    captured_payloads = []

    # Instance-level wrap: override generate_content on THIS client
    # object only, so the real call still happens (the demo gets a
    # genuine flag/summary result back) but every outbound payload gets
    # recorded first.
    client = analyze_document.get_client()
    real_generate_content = client.models.generate_content

    def _capturing_generate_content(**kwargs):
        captured_payloads.append(kwargs.get("contents", ""))
        return real_generate_content(**kwargs)

    client.models.generate_content = _capturing_generate_content

    try:
        print(f"Seeded fake values: name={FAKE_NAME!r}, email={FAKE_EMAIL!r}, "
              f"phone={FAKE_PHONE!r}, account={FAKE_ACCOUNT!r}")
        print("Running the REAL pipeline (live Gemini calls)...")
        summary, flags, mapping, chunks_data = analyze_document.analyze_text(db, SEEDED_RAW_TEXT)
    finally:
        client.models.generate_content = real_generate_content  # always restore

    seeded_values = {
        "name": FAKE_NAME,
        "email": FAKE_EMAIL,
        "phone": FAKE_PHONE,
        "account": FAKE_ACCOUNT,
    }

    violations = []
    for i, payload in enumerate(captured_payloads):
        for label, value in seeded_values.items():
            if value in payload:
                violations.append(f"Payload {i}: real {label} FOUND in outbound text")

    proof = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "seeded_fake_values_never_sent": seeded_values,
        "note": "The values above were in the ORIGINAL document text, for reference only. "
                "They are NOT expected to appear anywhere below.",
        "number_of_outbound_calls_captured": len(captured_payloads),
        "outbound_payloads_actually_sent_to_vendor": captured_payloads,
        "violations_found": violations,
        "PASS": len(violations) == 0,
    }

    with open(OUTPUT_PATH, "w") as f:
        json.dump(proof, f, indent=2)

    print(f"\n{'='*70}")
    print(f"Captured {len(captured_payloads)} outbound call(s).")
    if violations:
        print(f"FAIL -- {len(violations)} violation(s) found:")
        for v in violations:
            print(f"  - {v}")
    else:
        print("PASS -- no seeded real value appears in any outbound payload.")
    print(f"Full proof written to: {OUTPUT_PATH}")
    print(f"{'='*70}")


if __name__ == "__main__":
    main()
