import math

from app.database import get_session
from app.models import TrackHistory, User, Track, Artist, Album
from typing import Optional
from fastapi import APIRouter, Cookie, Depends, HTTPException
from sqlalchemy import Float, cast, desc, asc, func, select, text
from sqlmodel import Session

router = APIRouter()
@router.get("/")
async def get_user_albums(
    *,
    session_id: Optional[str] = Cookie(None),
    db: Session = Depends(get_session),
    offset: int = 0,
    limit: int = 50,
    sort_by: str = "play_count",
    direction: str = "desc",
    artist: Optional[str] = None,
    album: Optional[str] = None,
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
    user_result = db.exec(select(User).where(User.session_id == session_id)).first()
    if not user_result: raise HTTPException(status_code=401, detail="Utilisateur introuvable")
    if isinstance(user_result, User): current_user_id = user_result.id
    else: current_user_id = user_result[0].id

    sum_played = func.sum(TrackHistory.ms_played)
    sum_duration = func.sum(Track.duration_ms)
    engagement_sql = (cast(sum_played, Float) / func.nullif(cast(sum_duration, Float), 0)).label("engagement")
    play_count = func.count(TrackHistory.id).label("play_count")
    total_minutes = (cast(sum_played, Float) / 60000).label("total_minutes")

    query = (
        select(
            Album,
            Artist.name.label("artist_name"),
            play_count,
            total_minutes,
            engagement_sql
        )
        .join(Track, Track.album_id == Album.spotify_id)
        .join(Artist, Album.artist_id == Artist.spotify_id)
        .join(TrackHistory, Track.spotify_id == TrackHistory.spotify_id)
        .where(TrackHistory.user_id == current_user_id)
    )
    if artist: query = query.where(Artist.name.ilike(f"%{artist}%"))
    if album: query = query.where(Album.name.ilike(f"%{album}%"))
    query = query.group_by(Album.spotify_id, Artist.name)
    if streams_min is not None: query = query.having(play_count >= streams_min)
    if streams_max is not None: query = query.having(play_count <= streams_max)
    if minutes_min is not None: query = query.having(total_minutes >= minutes_min)
    if minutes_max is not None: query = query.having(total_minutes <= minutes_max)
    if engagement_min is not None: query = query.having(engagement_sql >= engagement_min / 100)
    if engagement_max is not None: query = query.having(engagement_sql <= engagement_max / 100)
    results = db.exec(query).all()

    final_list = []
    for row in results:
        album_obj, art_name, count, mins, eng = row
        eng = min(eng or 0.0, 1.0)
        rating = round((eng * .5) + (math.log10(count + 1) * .16) + (math.log10(mins + 1) * .16), 2)
        if rating_min and rating < rating_min: continue
        if rating_max and rating > rating_max: continue
        final_list.append({
            "spotify_id": album_obj.spotify_id,
            "name": album_obj.name,
            "artist": art_name,
            "cover": album_obj.image_url,
            "play_count": count,
            "total_minutes": round(mins),
            "engagement": round(eng * 100, 2),
            "rating": rating or 0
        })
    reverse = (direction == "desc")
    if sort_by in ["play_count", "total_minutes", "engagement", "rating"]:
        final_list.sort(key=lambda x: x[sort_by], reverse=reverse)
    return final_list[offset : offset + limit]

@router.get("/metadata")
async def get_albums_metadata(db: Session = Depends(get_session),session_id: Optional[str] = Cookie(None)):
    if not session_id: raise HTTPException(status_code=401, detail="Non connecté")
    user_result = db.exec(select(User).where(User.session_id == session_id)).first()
    if not user_result: raise HTTPException(status_code=401, detail="Utilisateur introuvable")
    if isinstance(user_result, User): current_user_id = user_result.id
    else: current_user_id = user_result[0].id
    
    # On cherche le max d'écoutes et le max de minutes via TrackHistory
    # Groupé par album pour trouver le record absolu de l'utilisateur
    stats = db.exec(
        select(
            func.count(TrackHistory.id).label("max_streams"),
            func.sum(TrackHistory.ms_played).label("max_ms")
        )
        .join(Track, Track.spotify_id == TrackHistory.spotify_id)
        .join(Album, Album.spotify_id == Track.album_id)
        .where(TrackHistory.user_id == current_user_id)
        .group_by(Album.spotify_id)
        .order_by(text("max_streams DESC"))
        .limit(1)
    ).first()

    if not stats: return {"max_streams": 100, "max_minutes": 100}

    return {
        "max_streams": stats[0],
        "max_minutes": round((stats[1] or 0) / 60000)
    }