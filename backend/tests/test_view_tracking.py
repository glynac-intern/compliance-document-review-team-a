"""
Tests for TA-28: opening a document must record a view event regardless
of role (advisor or officer), and repeated views must be handled
deliberately -- collapsed when consecutive, but logged fresh again once
something else has happened since.
"""

FAKE_PDF = ("test.pdf", b"%PDF-1.4 minimal fake content", "application/pdf")


def _submit(client, advisor_token):
    resp = client.post(
        "/documents",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": FAKE_PDF},
    )
    return resp.json()["id"]


def _actions(client, doc_id, token):
    resp = client.get(f"/documents/{doc_id}/audit", headers={"Authorization": f"Bearer {token}"})
    return [e["action"] for e in resp.json()]


def test_advisor_view_is_recorded(client, advisor_token):
    doc_id = _submit(client, advisor_token)
    client.get(f"/documents/{doc_id}", headers={"Authorization": f"Bearer {advisor_token}"})

    actions = _actions(client, doc_id, advisor_token)
    assert "viewed" in actions


def test_officer_view_is_recorded(client, advisor_token, officer_token):
    doc_id = _submit(client, advisor_token)
    client.get(f"/review/documents/{doc_id}", headers={"Authorization": f"Bearer {officer_token}"})

    actions = _actions(client, doc_id, advisor_token)
    assert "viewed" in actions


def test_consecutive_views_by_same_actor_collapse_to_one(client, advisor_token):
    doc_id = _submit(client, advisor_token)
    client.get(f"/documents/{doc_id}", headers={"Authorization": f"Bearer {advisor_token}"})
    client.get(f"/documents/{doc_id}", headers={"Authorization": f"Bearer {advisor_token}"})
    client.get(f"/documents/{doc_id}", headers={"Authorization": f"Bearer {advisor_token}"})

    actions = _actions(client, doc_id, advisor_token)
    assert actions.count("viewed") == 1


def test_view_logs_fresh_after_intervening_activity(client, advisor_token, officer_token):
    """The exact bug caught during manual testing: an advisor's later
    view must be logged even if THEIR OWN last recorded action was
    already 'viewed', as long as something else (a decision) happened
    on the document since then."""
    doc_id = _submit(client, advisor_token)

    client.get(f"/documents/{doc_id}", headers={"Authorization": f"Bearer {advisor_token}"})
    client.get(f"/documents/{doc_id}", headers={"Authorization": f"Bearer {advisor_token}"})
    client.get(f"/review/documents/{doc_id}", headers={"Authorization": f"Bearer {officer_token}"})
    client.post(
        f"/review/documents/{doc_id}/decision",
        headers={"Authorization": f"Bearer {officer_token}"},
        json={"status": "approved", "comment": "Fine."},
    )
    client.get(f"/documents/{doc_id}", headers={"Authorization": f"Bearer {advisor_token}"})

    actions = _actions(client, doc_id, advisor_token)
    assert actions == ["submitted", "viewed", "viewed", "decided", "viewed"]
