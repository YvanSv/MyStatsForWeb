from typing import List, Optional
from fastapi import APIRouter, Depends
from fastapi_cache.decorator import cache
from sqlalchemy import Date, cast
from sqlmodel import Session
from app.database import get_session
from app.models import Artist, Track, TrackHistory
from app.response_message import ArtistMetadataResponse, ArtistStatsResponse
from app.data.my.utils.metadata import get_entity_stats, get_generic_metadata
from app.utils.rating import get_formulas

router = APIRouter()

@router.get(
    "",
    summary="Classement global des artistes",
    response_model=List[ArtistStatsResponse]
)
@cache(expire=300)
async def get_all_artists(
    *,
    db: Session = Depends(get_session),
    offset: int = 0,
    limit: int = 50,
    sort: str = "play_count",
    direction: str = "desc",
    artist: Optional[str] = None,
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
    """Statistiques par artiste, tous utilisateurs confondus (mêmes calculs que `/data/my/artists`)."""
    _, _, f_artist = get_formulas()

    search_filters = []
    if artist: search_filters.append(Artist.name.ilike(f"%{artist}%"))
    if date_min: search_filters.append(cast(TrackHistory.played_at, Date) >= date_min)
    if date_max: search_filters.append(cast(TrackHistory.played_at, Date) <= date_max)

    results = get_entity_stats(db, None, Artist, Artist.id, f_artist, locals(), search_filters)

    return [{
        "id": r[0].id,
        "name": r[0].name,
        "image_url": r[0].image_url,
        "play_count": r.play_count,
        "total_minutes": r.total_minutes or 0,
        "engagement": min(r.engagement or 0, 100),
        "rating": r.rating or 0
    } for r in results]

@router.get("/metadata", summary="Bornes maximales des artistes", response_model=ArtistMetadataResponse)
@cache(expire=300)
async def get_artists_metadata(db: Session = Depends(get_session)):
    """Records (streams, minutes, rating) et plage de dates globale, pour calibrer les filtres."""
    _, _, f_artist = get_formulas()
    return get_generic_metadata(db, None, Track.artist_id, f_artist)
