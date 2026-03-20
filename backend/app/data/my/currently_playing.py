from typing import Optional
from pydantic import BaseModel
from app.database import get_session
from app.models import User
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from app.auth.utils.auth_utils import get_current_user_id
from app.spotify.utils.api_call import run_spotify_task
from app.spotify.utils.spotify_api import get_spotify_users_client
from app.spotify.utils.spotify_token import get_valid_access_token

class TrackData(BaseModel):
    title: str
    duration_ms: int
    progress_ms: int
    album_name: str
    artist_name: str
    cover_url: str

class CurrentlyPlaying(BaseModel):
    is_listening: bool
    data: Optional[TrackData] = None

router = APIRouter()

@router.get('', response_model=CurrentlyPlaying)
async def get_today(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_session)):
    user = db.get(User, user_id)
    if not user: raise HTTPException(status_code=401, detail="Session invalide")
    if user.spotify_email is None : return CurrentlyPlaying(is_listening=False, data=None)
    sp = get_spotify_users_client(await get_valid_access_token(user,db))
    data = await run_spotify_task(sp.currently_playing)

    if not data or not data.get("item") or not data["is_playing"]: return CurrentlyPlaying(is_listening=False, data=None)

    title, duration_ms, progress_ms, album_name, cover_url, artist_name = "",0,0,"","",""
    playing_type = data["currently_playing_type"]
    title = data["item"]["name"]
    duration_ms = data["item"]["duration_ms"]
    if playing_type == "track":
        progress_ms = data["progress_ms"]
        album_name = data["item"]["album"]["name"]
        cover_url = data["item"]["album"]["images"][0]["url"]
        artist_name = data["item"]["artists"][0]["name"]
    elif playing_type == "episode":
        progress_ms = data["item"]["resume_point"]["resume_position_ms"]
        cover_url = data["item"]["images"][0]["url"]

    return CurrentlyPlaying(
        is_listening=True,
        data=TrackData(
            title=title,
            duration_ms=duration_ms,
            progress_ms=progress_ms,
            album_name=album_name,
            artist_name=artist_name,
            cover_url=cover_url
        )
    )

@router.put("/pause")
async def pause_playback(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_session)):
    user = db.get(User, user_id)
    sp = get_spotify_users_client(await get_valid_access_token(user, db))
    return await run_spotify_task(sp.pause_playback)

@router.put("/resume")
async def resume_playback(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_session)):
    user = db.get(User, user_id)
    sp = get_spotify_users_client(await get_valid_access_token(user, db))
    return await run_spotify_task(sp.start_playback)

@router.post("/next")
async def next_track(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_session)):
    user = db.get(User, user_id)
    sp = get_spotify_users_client(await get_valid_access_token(user, db))
    return await run_spotify_task(sp.next_track)

@router.post("/previous")
async def previous_track(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_session)):
    user = db.get(User, user_id)
    sp = get_spotify_users_client(await get_valid_access_token(user, db))
    return await run_spotify_task(sp.previous_track)