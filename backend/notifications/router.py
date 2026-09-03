from fastapi import APIRouter

router = APIRouter()

# Blueprint v0.2 §3.3 doesn't define standalone notification endpoints —
# in-app notifications surface via the dashboards (GET /documents,
# GET /review/queue) reflecting current state. Revisit if the team wants
# a dedicated notifications feed later.
