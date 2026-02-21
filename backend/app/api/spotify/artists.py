import math
from fastapi import APIRouter, Depends, Cookie, HTTPException
from sqlalchemy import Float, cast, text
from sqlmodel import Session, select, func
from typing import Optional
from app.database import get_session
from app.models import User, Artist, Track, TrackHistory

router = APIRouter()

@router.get("/")
async def get_artists(
    *,
    session_id: Optional[str] = Cookie(None),
    db: Session = Depends(get_session),
    offset: int = 0,
    limit: int = 50,
    sort_by: str = "play_count",
    direction: str = "desc",
    artist: Optional[str] = None,
    streams_min: Optional[int] = None,
    streams_max: Optional[int] = None,
    minutes_min: Optional[float] = None,
    minutes_max: Optional[float] = None,
    rating_min: Optional[float] = None,
    rating_max: Optional[float] = None,
    engagement_min: Optional[float] = None,
    engagement_max: Optional[float] = None
):
    if not session_id: raise HTTPException(status_code=401, detail="Non connecté")
    user = db.exec(select(User).where(User.session_id == session_id)).first()
    if not user: raise HTTPException(status_code=401, detail="Utilisateur introuvable")
    current_user_id = user.id

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
        .where(TrackHistory.user_id == current_user_id)
    )
    if artist: query = query.where(Artist.name.ilike(f"%{artist}%"))
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
        rating = round(min((eng * .5) + (math.log10(count + 1) * .16) + (math.log10(mins + 1) * .16), 10.0), 2)
        if rating_min and rating < rating_min: continue
        if rating_max and rating > rating_max: continue
        all_artists.append({
            "id": artist_obj.spotify_id,
            "name": artist_obj.name,
            "image_url": artist_obj.image_url,
            "play_count": count,
            "total_minutes": round(mins),
            "engagement": round(eng * 100, 2),
            "rating": rating or 0
        })
    reverse = (direction == "desc")
    if sort_by in ["play_count", "total_minutes", "engagement", "rating"]:
        all_artists.sort(key=lambda x: x[sort_by], reverse=reverse)
    return all_artists[offset : offset + limit]

@router.get("/metadata")
async def get_artists_metadata(db: Session = Depends(get_session), session_id: Optional[str] = Cookie(None)):
    if not session_id: raise HTTPException(status_code=401, detail="Non connecté")
    user = db.exec(select(User).where(User.session_id == session_id)).first()
    if not user: raise HTTPException(status_code=401, detail="Utilisateur introuvable")
    
    stats = db.exec(
        select(
            func.count(TrackHistory.id).label("max_streams"),
            func.sum(TrackHistory.ms_played).label("max_ms")
        )
        .join(Track, Track.spotify_id == TrackHistory.spotify_id)
        .where(TrackHistory.user_id == user.id)
        .group_by(Track.artist_id)
        .order_by(text("max_streams DESC"))
        .limit(1)
    ).first()

    if not stats: return {"max_streams": 100, "max_minutes": 100}

    return {
        "max_streams": stats[0],
        "max_minutes": round((stats[1] or 0) / 60000)
    }