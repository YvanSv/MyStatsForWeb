from fastapi import APIRouter
from .tracks import router as tracks_router
from .artists import router as artists_router
from .albums import router as albums_router

router = APIRouter(prefix="/data/all", tags=["All datas"])
router.include_router(albums_router, prefix="/albums")
router.include_router(artists_router, prefix="/artists")
router.include_router(tracks_router, prefix="/tracks")