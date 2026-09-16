import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from auth.router import router as auth_router
from documents.router import router as documents_router
from reviews.router import router as review_router
from notifications.router import router as notifications_router

app = FastAPI(title="Compliance Document Review API")

# Deployed environments (e.g. the demo VM) are reached by IP/hostname
# instead of localhost, so the frontend served from there is a
# different CORS origin. PUBLIC_HOST (optional; unset in local dev)
# covers that -- found because this had been patched by hand, directly
# on the VM, uncommitted, with nothing else in the repo ever setting
# it: any future `git checkout`/reset there would have silently wiped
# it and broken the live demo with no obvious cause.
#
# TA-89: PUBLIC_HOST is now a real hostname (Caddy needs one for
# automatic HTTPS -- it cannot issue a cert for a bare IP), served over
# HTTPS through Caddy rather than :3000 directly. The old bare-IP/:3000
# form is kept too so a deployment mid-migration (DNS/NSG not switched
# over yet) doesn't lose CORS access.
allowed_origins = ["http://localhost:3000"]
public_host = os.environ.get("PUBLIC_HOST")
if public_host:
    allowed_origins.append(f"http://{public_host}:3000")
    allowed_origins.append(f"https://{public_host}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(documents_router, prefix="/documents", tags=["documents"])
app.include_router(review_router, prefix="/review", tags=["review"])
app.include_router(notifications_router, prefix="/notifications", tags=["notifications"])
