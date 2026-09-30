from typing import List, Optional
from fastapi import APIRouter, Depends
from fastapi_cache.decorator import cache
from sqlalchemy import Date, cast
from sqlmodel import Session
from app.database import get_session
from app.models import Album, Artist, Track, TrackHistory
from app.response_message import TrackMetadataResponse, TrackStatsResponse
from app.data.my.utils.metadata import get_entity_stats, get_generic_metadata
from app.utils.rating import get_formulas

router = APIRouter()

@router.get(
    "",
    summary="Classement global des musiques",
    response_model=List[TrackStatsResponse]
)
@cache(expire=300)
async def get_all_musics(
    *,
    db: Session = Depends(get_session),
    offset: int = 0,
    limit: int = 50,
    sort: str = "play_count",
    direction: str = "desc",
    track: Optional[str] = None,
    artist: Optional[str] = None,
    album: Optional[str] = None,
    streams_min: Optional[int] = None,
    streams_max: Optional[int] = None,
    minutes_min: Optional[float] = None,
    minutes_max: Optional[float] = None,
    rating_min: Optional[float] = None,
    rating_max: Optional[float] = None,
    engagement_min: Optional[float] = None,
    engagement_max: Optional[float] = None,
    date_min: Optional[str] = None,
    date_max: Optional[str] = None,
):
    """Statistiques par morceau, tous utilisateurs confondus (mêmes calculs que `/data/my/tracks`)."""
    f_track, _, _ = get_formulas()

    search_filters = []
    if track: search_filters.append(Track.title.ilike(f"%{track}%"))
    if artist: search_filters.append(Artist.name.ilike(f"%{artist}%"))
    if album: search_filters.append(Album.name.ilike(f"%{album}%"))
    if date_min: search_filters.append(cast(TrackHistory.played_at, Date) >= date_min)
    if date_max: search_filters.append(cast(TrackHistory.played_at, Date) <= date_max)

    results = get_entity_stats(db, None, Track, Track.id, f_track, locals(), search_filters)

    return [{
        "id": r[0].id,
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

@router.get("/metadata", summary="Bornes maximales des musiques", response_model=TrackMetadataResponse)
@cache(expire=300)
async def get_musics_metadata(db: Session = Depends(get_session)):
    """Records (streams, minutes, rating) et plage de dates globale, pour calibrer les filtres."""
    f_track, _, _ = get_formulas()
    return get_generic_metadata(db, None, Track.id, f_track)
