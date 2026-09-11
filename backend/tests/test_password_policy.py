"""
Tests for TA-14: sign-up must enforce a minimum password complexity
rule, not accept any string.
"""


def test_signup_rejects_password_too_short(client):
    resp = client.post("/auth/signup", json={
        "name": "Test User", "email": "shortpass@test.com",
        "password": "ab1", "role": "advisor",
    })
    assert resp.status_code == 422
    assert "8 characters" in resp.text


def test_signup_rejects_password_without_digit(client):
    resp = client.post("/auth/signup", json={
        "name": "Test User", "email": "nodigit@test.com",
        "password": "onlylettershere", "role": "advisor",
    })
    assert resp.status_code == 422
    assert "digit" in resp.text.lower()


def test_signup_rejects_password_without_letter(client):
    resp = client.post("/auth/signup", json={
        "name": "Test User", "email": "noletter@test.com",
        "password": "12345678", "role": "advisor",
    })
    assert resp.status_code == 422
    assert "letter" in resp.text.lower()


def test_signup_accepts_valid_password(client):
    resp = client.post("/auth/signup", json={
        "name": "Test User", "email": "goodpass@test.com",
        "password": "realpassword123", "role": "advisor",
    })
    assert resp.status_code == 201
