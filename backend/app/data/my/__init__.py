from fastapi import APIRouter
# from .history import router as history_router
from .tracks import router as tracks_router
from .artists import router as artists_router
from .albums import router as albums_router
from .import_data import router as import_data_router
from .clear import router as clear_router
from .today import router as today_router
from .refresh import router as refresh_router
from .currently_playing import router as currently_playing_router

router = APIRouter(prefix="/data/my", tags=["My datas"])
router.include_router(albums_router, prefix="/albums")
router.include_router(artists_router, prefix="/artists")
router.include_router(import_data_router, prefix="/upload-json")
router.include_router(tracks_router, prefix="/tracks")
router.include_router(clear_router, prefix="/clear")
router.include_router(today_router, prefix="/today")
router.include_router(refresh_router, prefix="/refresh")
router.include_router(currently_playing_router, prefix="/currently-playing")