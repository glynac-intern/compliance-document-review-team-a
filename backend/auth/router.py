from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.post("/signup")
def signup():
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.post("/login")
def login():
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.post("/logout")
def logout():
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/me")
def me():
    raise HTTPException(status_code=501, detail="Not implemented yet")
