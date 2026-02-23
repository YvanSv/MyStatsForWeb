from fastapi import APIRouter
from .status import router as status_router

router = APIRouter(prefix="/spotify", tags=["Spotify"])
router.include_router(status_router, prefix="/status", tags=["Status"])