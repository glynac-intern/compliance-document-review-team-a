"""
Shared pytest fixtures: a dedicated test database (separate from dev data),
a FastAPI TestClient wired to it via dependency override, and helper
fixtures to create fresh advisor/officer users per test.

Isolation strategy: each test gets a fresh session; after the test, all
tables are truncated so the next test starts from empty. Simpler and more
robust to get right than nested-transaction isolation, and sufficient for
this project's scope.
"""

import os
from pathlib import Path

# Provide a valid test secret key when running pytest outside docker / without .env loaded
os.environ.setdefault("BACKEND_SECRET_KEY", "ci_dummy_secret_for_testing_only_32char")

import psycopg2
import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from database import Base, get_db
import models  # noqa: F401 -- registers all tables on Base.metadata

TEST_DB_NAME = "compliance_test_db"


def _build_url(dbname: str) -> str:
    base = os.environ["DATABASE_URL"]
    prefix = base.rsplit("/", 1)[0]
    return f"{prefix}/{dbname}"


@pytest.fixture(scope="session")
def test_db_engine():
    admin_database_url = _build_url("postgres")
    test_database_url = _build_url(TEST_DB_NAME)

    conn = psycopg2.connect(admin_database_url)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (TEST_DB_NAME,))
    if cur.fetchone() is None:
        cur.execute(f"CREATE DATABASE {TEST_DB_NAME}")
    cur.close()
    conn.close()

    # TA-75: build the test schema via the REAL Alembic migrations, not
    # Base.metadata.create_all(). create_all() always reflects whatever
    # the current model classes say, regardless of migration state --
    # it can NEVER catch "a model changed but no migration was written
    # for it". Running the actual migration chain is what makes model
    # drift genuinely fail tests, and exercises the same path a clean
    # checkout takes. The extension is created by the first migration
    # itself, so no separate manual step is needed here anymore.
    original_db_url = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = test_database_url
    try:
        # TA-79: __file__-relative, not a hardcoded container path --
        # alembic.ini is always backend/'s own sibling, in Docker or out.
        alembic_cfg = Config(str(Path(__file__).parent.parent / "alembic.ini"))
        command.upgrade(alembic_cfg, "head")
    finally:
        if original_db_url is not None:
            os.environ["DATABASE_URL"] = original_db_url

    engine = create_engine(test_database_url)
    yield engine
    engine.dispose()


@pytest.fixture()
def db_session(test_db_engine):
    SessionLocalTest = sessionmaker(bind=test_db_engine)
    session = SessionLocalTest()
    yield session
    session.close()

    # Reset for the next test.
    with test_db_engine.connect() as conn:
        table_names = ", ".join(t.name for t in reversed(Base.metadata.sorted_tables))
        conn.execute(text(f"TRUNCATE TABLE {table_names} RESTART IDENTITY CASCADE"))
        conn.commit()


@pytest.fixture()
def client(db_session):
    from main import app

    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _signup_and_login(client, email, password, role):
    signup_resp = client.post(
        "/auth/signup",
        json={
            "name": "Test User",
            "email": email,
            "password": password,
            "role": role,
        },
    )
    assert signup_resp.status_code == 201, f"Signup failed: {signup_resp.status_code} {signup_resp.text}"

    login_resp = client.post("/auth/login", json={"email": email, "password": password})
    assert login_resp.status_code == 200, f"Login failed: {login_resp.status_code} {login_resp.text}"
    return login_resp.json()["access_token"]


@pytest.fixture()
def advisor_token(client):
    return _signup_and_login(client, "advisor@rolefixture.io", "testpass123", "advisor")


@pytest.fixture()
def officer_token(client):
    return _signup_and_login(client, "officer@rolefixture.io", "testpass123", "officer")


@pytest.fixture()
def second_advisor_token(client):
    """A distinct advisor account, for TA-88: cross-advisor access probes
    need two different advisors, not just advisor-vs-officer."""
    return _signup_and_login(client, "second-advisor@rolefixture.io", "testpass123", "advisor")
