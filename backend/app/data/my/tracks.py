import math

from app.database import get_session
from app.models import TrackHistory, Track, Artist, Album
from typing import Optional, List
from fastapi import APIRouter, Depends
from sqlalchemy import Float, cast, func
from sqlmodel import Session
from app.response_message import TrackStatsResponse, TrackMetadataResponse
from app.auth.utils.auth_utils import get_current_user_id
from .utils.metadata import get_entity_stats, get_formulas, get_generic_metadata

router = APIRouter()

@router.get("", response_model=List[TrackStatsResponse])
async def get_user_musics(
    *,
    db: Session = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
    offset: int = 0, limit: int = 50,
    sort: str = "play_count", direction: str = "desc",
    track: str = "", artist: str = "", album: str = "",
    streams_min: int = 0, streams_max: Optional[int] = None,
    minutes_min: float = 0, minutes_max: Optional[float] = None,
    rating_min: float = 0, rating_max: Optional[float] = None,
    engagement_min: float = 0, engagement_max: float = 100,
    date_min: Optional[str] = None, date_max: Optional[str] = None,
):
    # 1. Récupération de la formule spécifique Track
    # (On pourrait aussi l'importer d'un fichier formulas.py)
    raw_ms = cast(func.sum(TrackHistory.ms_played), Float)
    raw_dur = func.nullif(cast(func.sum(Track.duration_ms), Float), 0)
    cnt = func.count(TrackHistory.id)
    
    m = raw_ms / 60000.0
    e = raw_ms / raw_dur
    
    # f_track = ((e * m / (20.0 * func.nullif(cnt, 0)) + (m / 40.0)) / 8.0)
    f_track = (func.log(func.nullif(m, 0)) + func.log(func.nullif(cnt, 0))) * e / 3.1

    # 2. Clauses WHERE spécifiques (recherche textuelle et dates)
    search_filters = []
    if track: search_filters.append(Track.title.ilike(f"%{track}%"))
    if artist: search_filters.append(Artist.name.ilike(f"%{artist}%"))
    if album: search_filters.append(Album.name.ilike(f"%{album}%"))
    if date_min: search_filters.append(TrackHistory.played_at >= date_min)
    if date_max: search_filters.append(TrackHistory.played_at <= f"{date_max} 23:59:59")

    # 3. Appel du moteur générique
    results = get_entity_stats(db,user_id,Track,Track.spotify_id,f_track,locals(),search_filters)

    # 4. Formatage de la réponse
    return [{
        "spotify_id": r[0].spotify_id,
        "title": r[0].title,
        "artist": r[0].artist.name if r[0].artist else "Inconnu",
        "album": r[0].album.name if r[0].album else "Inconnu",
        "cover": r[0].album.image_url if r[0].album else None,
        "duration_ms": r[0].duration_ms,
        "play_count": r.play_count,
        "total_minutes": r.total_minutes or 0,
        "engagement": min(r.engagement or 0, 100),
        "rating": r.rating or 0
    } for r in results]

@router.get('/metadata', response_model=TrackMetadataResponse)
async def get_user_tracks_metadata(db: Session = Depends(get_session),user_id: int = Depends(get_current_user_id)):
    f_track, _, _ = get_formulas()
    return get_generic_metadata(db, user_id, Track.spotify_id, f_track)