"""
Tests for TA-110: prove a tampered JWT role claim is rejected, not just
a mismatched DB role.

create_access_token embeds `role` directly in the JWT payload
(auth/security.py:44-47), and get_current_user re-looks-up the user's
actual role from the DB rather than trusting the token's claim
(auth/dependencies.py) -- so this SHOULD already be safe. These tests
attack the token itself rather than checking where the role check was
built, on the assumption that forging a token is the first thing an
attacker without valid officer credentials would try. If any of these
somehow succeed, that's a real hole: becomes a failing test first, a
fix second, same pattern as TA-88.
"""
import base64
import json

from jose import jwt

from auth.security import ALGORITHM

FAKE_PDF = ("test.pdf", b"%PDF-1.4 minimal fake content", "application/pdf")


def _b64url_decode(segment: str) -> bytes:
    padded = segment + "=" * (-len(segment) % 4)
    return base64.urlsafe_b64decode(padded)


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def test_a_genuinely_valid_advisor_token_is_accepted(client, advisor_token):
    """Sanity check -- these tests aren't just rejecting every token."""
    resp = client.get("/auth/me", headers={"Authorization": f"Bearer {advisor_token}"})
    assert resp.status_code == 200
    assert resp.json()["role"] == "advisor"


def test_role_claim_tampered_but_original_signature_reused_is_rejected(client, advisor_token):
    """The literal tampering scenario: flip the role claim, keep the
    original (now-mismatched) signature -- an attacker without the
    server's secret can't produce a valid signature for the new payload."""
    header_b64, payload_b64, signature_b64 = advisor_token.split(".")
    payload = json.loads(_b64url_decode(payload_b64))
    assert payload["role"] == "advisor"
    payload["role"] = "officer"
    tampered_payload_b64 = _b64url_encode(json.dumps(payload).encode())
    forged_token = f"{header_b64}.{tampered_payload_b64}.{signature_b64}"

    resp = client.get("/auth/me", headers={"Authorization": f"Bearer {forged_token}"})
    assert resp.status_code == 401

    # Also probed against an actual role-gated endpoint, not just /me.
    resp2 = client.get("/review/queue", headers={"Authorization": f"Bearer {forged_token}"})
    assert resp2.status_code == 401


def test_token_signed_with_a_guessed_secret_is_rejected(client, advisor_token):
    """An attacker who doesn't know BACKEND_SECRET_KEY has to guess one --
    simulate that instead of re-using the real key (which would mean the
    secret already leaked, a different problem entirely)."""
    _, payload_b64, _ = advisor_token.split(".")
    payload = json.loads(_b64url_decode(payload_b64))
    payload["role"] = "officer"
    forged_token = jwt.encode(payload, "attacker-guessed-secret-not-the-real-one", algorithm=ALGORITHM)

    resp = client.get("/auth/me", headers={"Authorization": f"Bearer {forged_token}"})
    assert resp.status_code == 401


def test_alg_none_token_is_rejected(client, advisor_token):
    """The classic 'alg: none' JWT bypass -- a token claiming no
    signature algorithm at all, so anyone can construct a 'valid' one
    without knowing any secret."""
    _, payload_b64, _ = advisor_token.split(".")
    payload = json.loads(_b64url_decode(payload_b64))
    payload["role"] = "officer"

    none_header_b64 = _b64url_encode(json.dumps({"alg": "none", "typ": "JWT"}).encode())
    tampered_payload_b64 = _b64url_encode(json.dumps(payload).encode())
    # alg:none tokens carry an empty signature segment by spec.
    forged_token = f"{none_header_b64}.{tampered_payload_b64}."

    resp = client.get("/auth/me", headers={"Authorization": f"Bearer {forged_token}"})
    assert resp.status_code == 401


def test_malformed_token_is_rejected_not_500(client):
    """Not a signature attack, just garbage input -- must 401, not crash."""
    resp = client.get("/auth/me", headers={"Authorization": "Bearer not-a-real-jwt-at-all"})
    assert resp.status_code == 401
