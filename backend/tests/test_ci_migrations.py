"""
Tests for TA-75: the test database schema comes from real Alembic
migrations, not Base.metadata.create_all() -- which can never catch a
model changed with no corresponding migration.

Note: the CI workflow's own "alembic upgrade head" step
(.github/workflows/tests.yml) lives at the repo root, outside the
backend container's filesystem entirely -- it can't be asserted on
from inside a pytest run here. That step was verified directly (cat'd
the file, confirmed the step is present) rather than via an automated
test that could never actually reach it.
"""
from pathlib import Path
import pytest

pytestmark = pytest.mark.unit


def test_conftest_uses_alembic_not_create_all():
    """Structural check: confirms the fix is genuinely in place, not
    just that tests happen to pass today."""
    # TA-79: __file__-relative, not a hardcoded container path -- this
    # file and conftest.py are always siblings, in Docker or outside it.
    content = (Path(__file__).parent / "conftest.py").read_text()
    assert "command.upgrade" in content
    assert "Base.metadata.create_all(engine)" not in content
