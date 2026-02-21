from fastapi import APIRouter
from app.utils.spotify_status import spotify_status

router = APIRouter()

@router.get("/")
async def get_spotify_api_status():
    return spotify_status.get_status()