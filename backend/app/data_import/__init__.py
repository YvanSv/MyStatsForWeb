from fastapi import APIRouter

from .spotify import router as spotify_import_router
from .apple_music import router as apple_import_router

router = APIRouter(prefix="/import", tags=["Data Import"])
router.include_router(spotify_import_router, prefix="/spotify")
router.include_router(apple_import_router, prefix="/apple")