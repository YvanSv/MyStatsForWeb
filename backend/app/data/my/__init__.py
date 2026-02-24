from fastapi import APIRouter
from .history import router as history_router
from .tracks import router as tracks_router
from .artists import router as artists_router
from .albums import router as albums_router
from .import_data import router as import_data_router
from .overview import router as overview_router

router = APIRouter(prefix="/data/my", tags=["My datas"])
router.include_router(albums_router, prefix="/albums", tags=["Albums"])
router.include_router(artists_router, prefix="/artists", tags=["Artists"])
router.include_router(history_router, prefix="/history", tags=["History"])
router.include_router(import_data_router, prefix="/upload-json", tags=["Import data"])
router.include_router(overview_router, prefix="/overview", tags=["Overview"])
router.include_router(tracks_router, prefix="/tracks", tags=["Tracks"])