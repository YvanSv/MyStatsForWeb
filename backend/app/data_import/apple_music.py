from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlmodel import Session
from app.response_message import UploadSuccessResponse, BaseModel
from app.auth.utils.auth_utils import get_current_user_id
from app.database import get_session
from app.models import MusicProvider, Track, TrackHistory, TrackMapping, ArtistMapping, AlbumMapping
from .workers.AppleMusicWorker import apple_music_worker
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

class AppleImportSchema(BaseModel):
    apple_track_id: str
    song_name: str
    artist_name: str
    played_at: str
    ms_played: int

def build_track_title(artist_name: str, song_name: str) -> str:
    """Titre enregistré pour une piste Apple : « Artiste - Titre », ou le titre seul quand l'artiste est inconnu."""
    artist, song = (artist_name or "").strip(), (song_name or "").strip()
    return f"{artist} - {song}" if artist else song

router = APIRouter()

@router.post("", response_model=UploadSuccessResponse)
async def upload_apple_json(
    files: List[AppleImportSchema],
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_session)
):
    if not files: return {"status": "success", "added": 0}

    history_raw = db.exec(
        select(TrackHistory.played_at, TrackHistory.track_id)
        .where(TrackHistory.user_id == user_id)
        .where(TrackHistory.provider == MusicProvider.APPLE_MUSIC)
    ).all()
    existing_history = {(row[0].replace(tzinfo=None), row[1]) for row in history_raw if row[0]}

    mapping_data = db.exec(
        select(TrackMapping.provider_id, Track.id, Track.artist_id, Track.album_id)
        .join(Track, TrackMapping.track_id == Track.id)
        .where(TrackMapping.provider == MusicProvider.APPLE_MUSIC)
    ).all()
    
    apple_track_info = {
        str(m_id): {"id": t_id, "artist_id": art_id, "album_id": alb_id}
        for m_id, t_id, art_id, alb_id in mapping_data
    }

    added_count = 0
    history_to_insert = []

    for item in files:
        if item.ms_played < 30000: continue

        try: dt_obj = datetime.fromisoformat(item.played_at.replace('Z', '+00:00')).replace(tzinfo=None)
        except (ValueError, TypeError): continue

        track_info = apple_track_info.get(str(item.apple_track_id))
        
        # Vérification doublon
        if track_info and (dt_obj, track_info["id"]) in existing_history: continue

        if not track_info:
            new_track = Track(title=build_track_title(item.artist_name, item.song_name))
            db.add(new_track)
            db.flush()
            
            t_id = new_track.id
            db.add(TrackMapping(
                provider=MusicProvider.APPLE_MUSIC,
                provider_id=item.apple_track_id,
                track_id=t_id
            ))
            
            track_info = {"id": t_id, "artist_id": None, "album_id": None}
            apple_track_info[str(item.apple_track_id)] = track_info
        
        # TrackHistory
        history_to_insert.append(TrackHistory(
            user_id=user_id,
            track_id=track_info["id"],
            played_at=dt_obj,
            ms_played=item.ms_played,
            provider=MusicProvider.APPLE_MUSIC,
            artist_id=track_info["artist_id"],
            album_id=track_info["album_id"]
        ))
        
        existing_history.add((dt_obj, track_info["id"]))
        added_count += 1

    if history_to_insert:
        db.add_all(history_to_insert)
        db.commit()
    
    await apple_music_worker.repair_metadata()
    return {"status": "success", "added": added_count}