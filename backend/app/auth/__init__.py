from fastapi import APIRouter
from .email_auth import router as email_auth_router
from .spotify_auth import router as spotify_auth_router

router = APIRouter()
router.include_router(email_auth_router,tags=["Email Auth"])
router.include_router(spotify_auth_router, tags=["Spotify Auth"])