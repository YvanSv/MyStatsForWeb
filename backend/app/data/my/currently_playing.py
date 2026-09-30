from typing import Optional
from pydantic import BaseModel
from app.database import get_session
from app.models import MusicProvider, User, UserAccount
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.auth.utils.auth_utils import get_current_user_id
from app.data_import.workers.spotify.utils.api_call import run_spotify_task
from app.data_import.workers.spotify.utils.spotify_api import get_spotify_users_client
from app.data_import.workers.spotify.utils.spotify_token import get_valid_access_token

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
    
    # Pas de compte Spotify lié -> rien à interroger
    spotify_account = db.exec(select(UserAccount).where(
        UserAccount.user_id == user.id,
        UserAccount.provider == MusicProvider.SPOTIFY
    )).first()
    if not spotify_account: return CurrentlyPlaying(is_listening=False)

    token = await get_valid_access_token(user, db)
    sp = get_spotify_users_client(token)
    data = await run_spotify_task(sp.currently_playing)

    # Si rien n'est écouté ou si c'est une pub/autre
    if not data or not data.get("item") or not data.get("is_playing"):
        return CurrentlyPlaying(is_listening=False)

    item = data["item"]
    playing_type = data.get("currently_playing_type", "track")
    
    # Initialisation des valeurs par défaut
    track_info = {
        "title": item.get("name", "Inconnu"),
        "duration_ms": item.get("duration_ms", 0),
        "progress_ms": data.get("progress_ms", 0),
        "album_name": "Podcast",
        "artist_name": "Animateur inconnu",
        "cover_url": ""
    }

    if playing_type == "track":
        album = item.get("album", {})
        track_info["album_name"] = album.get("name", "Single")
        track_info["artist_name"] = item["artists"][0]["name"] if item.get("artists") else "Artiste inconnu"
        if album.get("images"):
            track_info["cover_url"] = album["images"][0]["url"]
            
    elif playing_type == "episode":
        # Pour les podcasts
        show = item.get("show", {})
        track_info["album_name"] = show.get("name", "Podcast")
        track_info["artist_name"] = show.get("publisher", "Spotify")
        if item.get("images"):
            track_info["cover_url"] = item["images"][0]["url"]

    return CurrentlyPlaying(
        is_listening=True,
        data=TrackData(**track_info)
    )

# @router.put("/pause")
# async def pause_playback(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_session)):
#     user = db.get(User, user_id)
#     sp = get_spotify_users_client(await get_valid_access_token(user, db))
#     return await run_spotify_task(sp.pause_playback)

# @router.put("/resume")
# async def resume_playback(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_session)):
#     user = db.get(User, user_id)
#     sp = get_spotify_users_client(await get_valid_access_token(user, db))
#     return await run_spotify_task(sp.start_playback)

# @router.post("/next")
# async def next_track(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_session)):
#     user = db.get(User, user_id)
#     sp = get_spotify_users_client(await get_valid_access_token(user, db))
#     return await run_spotify_task(sp.next_track)

# @router.post("/previous")
# async def previous_track(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_session)):
#     user = db.get(User, user_id)
#     sp = get_spotify_users_client(await get_valid_access_token(user, db))
#     return await run_spotify_task(sp.previous_track)