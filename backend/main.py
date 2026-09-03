from fastapi import FastAPI

from auth.router import router as auth_router
from documents.router import router as documents_router
from reviews.router import router as review_router
from notifications.router import router as notifications_router

app = FastAPI(title="Compliance Document Review API")


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(documents_router, prefix="/documents", tags=["documents"])
app.include_router(review_router, prefix="/review", tags=["review"])
app.include_router(notifications_router, prefix="/notifications", tags=["notifications"])
