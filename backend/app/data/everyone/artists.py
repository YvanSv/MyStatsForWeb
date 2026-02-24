import math
from fastapi import APIRouter, Depends
from sqlalchemy import Date, Float, cast, text
from sqlmodel import Session, select, func
from typing import Optional
from app.database import get_session
from app.models import User, Artist, Track, TrackHistory
from .utils.metadata import get_date_metadata

router = APIRouter()

@router.get('')
async def get_artists(
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
    sum_played = func.sum(TrackHistory.ms_played)
    sum_duration = func.sum(Track.duration_ms)
    engagement_sql = (cast(sum_played, Float) / func.nullif(cast(sum_duration, Float), 0)).label("engagement")
    play_count = func.count(TrackHistory.id).label("play_count")
    total_minutes = (cast(sum_played, Float) / 60000).label("total_minutes")

    query = (
        select(
            Artist,
            play_count,
            total_minutes,
            engagement_sql
        )
        .join(Track, Artist.spotify_id == Track.artist_id)
        .join(TrackHistory, Track.spotify_id == TrackHistory.spotify_id)
    )
    if artist: query = query.where(Artist.name.ilike(f"%{artist}%"))
    if date_min: query = query.where(cast(TrackHistory.played_at, Date) >= date_min)
    if date_max: query = query.where(cast(TrackHistory.played_at, Date) <= f"{date_max} 23:59:59")
    query = query.group_by(Artist.spotify_id, Artist.name, Artist.image_url)
    if streams_min is not None: query = query.having(play_count >= streams_min)
    if streams_max is not None: query = query.having(play_count <= streams_max)
    if minutes_min is not None: query = query.having(total_minutes >= minutes_min)
    if minutes_max is not None: query = query.having(total_minutes <= minutes_max)
    if engagement_min is not None: query = query.having(engagement_sql >= engagement_min / 100)
    if engagement_max is not None: query = query.having(engagement_sql <= engagement_max / 100)
    results = db.exec(query).all()

    all_artists = []
    for row in results:
        artist_obj, count, mins, eng = row
        eng = min(eng or 0.0, 1.0)
        if count > 1:
            rating = (eng / (7 * count) + math.log(mins) / 25.0) * 4 + count*eng / 10000
        else: rating = 0
        if rating_min and rating <= rating_min: continue
        if rating_max and rating >= rating_max: continue
        all_artists.append({
            "id": artist_obj.spotify_id,
            "name": artist_obj.name,
            "image_url": artist_obj.image_url,
            "play_count": count,
            "total_minutes": round(mins),
            "engagement": round(eng * 100, 1),
            "rating": round(rating,2) or 0
        })
    if sort in ["name", "play_count", "total_minutes", "engagement", "rating"]:
        all_artists.sort(key=lambda x: x[sort], reverse=(direction == "desc"))
    return all_artists[offset : offset + limit]

@router.get("/metadata")
async def get_artists_metadata(db: Session = Depends(get_session)):
    # On récupère les stats de l'artiste le plus écouté
    # On doit joindre Track pour grouper par artist_id
    stats = db.exec(
        select(
            func.count(TrackHistory.id).label("max_streams"),
            func.sum(TrackHistory.ms_played).label("max_ms"),
            func.sum(Track.duration_ms).label("total_duration")
        )
        .join(Track, Track.spotify_id == TrackHistory.spotify_id)
        .group_by(Track.artist_id)
        .order_by(text("max_streams DESC"))
        .limit(1)
    ).first()

    date_min, date_max = get_date_metadata(db)
    if not stats: return {"max_streams": 100, "max_minutes": 100, "max_rating": 10, "date_min": date_min, "date_max": date_max}
    
    count = stats[0]
    mins = (stats[1] or 0) / 60000
    total_duration = stats[2] or 0
    eng = (stats[1] / total_duration) if total_duration > 0 else 0
    eng = min(eng, 1.0)
    if count > 1:
        max_rating = (eng / (7 * count) + math.log(mins) / 25.0) * 4 + count*eng / 10000

    return {
        "max_streams": count,
        "max_minutes": round(mins),
        "max_rating": max(round(max_rating,2)+.05, 0),
        "date_min": date_min,
        "date_max": date_max
    }