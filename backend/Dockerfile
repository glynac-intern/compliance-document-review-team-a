# TA-79: build context is the repo ROOT (not backend/), so the image's
# filesystem layout matches the real repo layout -- backend/, ai/, and
# data_pipeline/ as true siblings under /app, not ai/data_pipeline
# artificially reparented under backend's own root via compose mounts.
# This is what lets every first-party import be a normal package import
# (ai.masking.masker, data_pipeline.chunking.chunker, ...) instead of a
# sys.path hack per file, and lets the same imports resolve identically
# outside Docker (see pyproject.toml's [tool.pytest.ini_options] pythonpath).
FROM python:3.14-slim
WORKDIR /app
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY . .

# /app on sys.path resolves ai.X / data_pipeline.X; /app/backend on
# sys.path resolves backend's own modules (database, models, auth.*,
# documents.*, ...), which keep their existing flat-from-backend-root
# imports unchanged -- only the ai/ and data_pipeline/ cross-imports
# needed to become dotted package imports for this ticket.
ENV PYTHONPATH=/app:/app/backend

# --app-dir puts backend/ on sys.path and resolves main:app from there,
# without needing WORKDIR itself to be backend/ (which would break the
# data_pipeline/... script paths documented throughout the README/CI/
# setup.sh, all of which are relative to the repo root).
CMD ["uvicorn", "main:app", "--app-dir", "backend", "--host", "0.0.0.0", "--port", "8000", "--reload", "--reload-dir", "backend", "--reload-dir", "ai", "--reload-dir", "data_pipeline"]
