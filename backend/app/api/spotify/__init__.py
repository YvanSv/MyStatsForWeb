from fastapi import APIRouter
from .history import router as history_router
from .musics import router as musics_router
from .artists import router as artists_router
from .albums import router as albums_router

# On crée le routeur parent avec le préfixe global
router = APIRouter(prefix="/spotify", tags=["spotify"])

# On inclut les sous-routeurs
router.include_router(history_router, prefix="/history", tags=["History"])
router.include_router(musics_router, prefix="/musics", tags=["Musics"])
router.include_router(artists_router, prefix="/artists", tags=["Artists"])
router.include_router(albums_router, prefix="/albums", tags=["Albums"])