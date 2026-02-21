import math

from app.database import get_session
from app.models import TrackHistory, User, Track, Artist, Album
from typing import Optional
from fastapi import APIRouter, Cookie, Depends, HTTPException
from sqlalchemy import Float, cast, desc, asc, func, select, text
from sqlmodel import Session

router = APIRouter()

@router.get("/")
async def get_user_musics(
    *,
    session_id: Optional[str] = Cookie(None),
    db: Session = Depends(get_session),
    offset: int = 0,
    limit: int = 50,
    sort_by: str = "play_count",
    direction: str = "desc",
    # Paramètres de recherche
    track: Optional[str] = None,
    artist: Optional[str] = None,
    album: Optional[str] = None,
    # Filtres de stats
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

    play_count = func.count(TrackHistory.id).label("play_count")
    total_minutes = (cast(func.sum(TrackHistory.ms_played), Float) / 60000).label("total_minutes")
    sum_played = func.sum(TrackHistory.ms_played)
    sum_duration = func.sum(Track.duration_ms)
    engagement_sql = (cast(sum_played, Float) / func.nullif(cast(sum_duration, Float), 0)).label("engagement")

    query = (select(
            Track,
            Artist.name.label("artist"),
            Album.name.label("album"),
            Album.image_url.label("cover"),
            play_count,
            total_minutes,
            engagement_sql
        )
        .join(Album, Track.album_id == Album.spotify_id)
        .join(Artist, Track.artist_id == Artist.spotify_id)
        .join(TrackHistory, Track.spotify_id == TrackHistory.spotify_id)
        .where(TrackHistory.user_id == current_user_id)
    )
    if track: query = query.where(Track.title.ilike(f"%{track}%"))
    if artist: query = query.where(Artist.name.ilike(f"%{artist}%"))
    if album: query = query.where(Album.name.ilike(f"%{album}%"))
    query = query.group_by(
        Track.spotify_id,
        Track.title,
        Artist.name,
        Album.name,
        Album.image_url
    )
    if streams_min is not None: query = query.having(play_count >= streams_min)
    if streams_max is not None: query = query.having(play_count <= streams_max)
    if minutes_min is not None: query = query.having(total_minutes >= minutes_min)
    if minutes_max is not None: query = query.having(total_minutes <= minutes_max)
    if engagement_min is not None: query = query.having(engagement_sql >= engagement_min / 100)
    if engagement_max is not None: query = query.having(engagement_sql <= engagement_max / 100)
    
    order = text(f"{sort_by} {direction}")
    query = query.order_by(order)
    results = db.exec(query).all()

    all_musics = []
    for row in results:
        track_obj, artist_name, album_name, cover_url, count, mins, eng = row
        eng = min(eng or 0.0, 1.0)
        rating = round((eng * .55) + (math.log10(count + 1) * .18) + (math.log10(mins + 1) * .18), 2)
        if rating_min and rating < rating_min: continue
        if rating_max and rating > rating_max: continue

        all_musics.append({
            "spotify_id": track_obj.spotify_id,
            "title": track_obj.title,
            "artist": artist_name,
            "album": album_name,
            "cover": cover_url,        
            "duration_ms": track_obj.duration_ms,
            "play_count": count,
            "total_minutes": round(mins),
            "engagement": round(eng * 100, 2),
            "rating": rating or 0
        })
    if sort_by in ["play_count", "total_minutes", "engagement", "rating"]:
        all_musics.sort(key=lambda x: x[sort_by], reverse=(direction == "desc"))
    return all_musics[offset : offset + limit]

@router.get("/metadata")
async def get_musics_metadata(db: Session = Depends(get_session),session_id: Optional[str] = Cookie(None)):
    if not session_id: raise HTTPException(status_code=401, detail="Non connecté")
    user_result = db.exec(select(User).where(User.session_id == session_id)).first()
    if not user_result: raise HTTPException(status_code=401, detail="Utilisateur introuvable")
    if isinstance(user_result, User): current_user_id = user_result.id
    else: current_user_id = user_result[0].id
    
    # On cherche le max d'écoutes et le max de minutes via TrackHistory
    # Groupé par track pour trouver le record absolu de l'utilisateur
    stats = db.exec(
        select(
            func.count(TrackHistory.id).label("max_streams"),
            func.sum(TrackHistory.ms_played).label("max_ms")
        )
        .where(TrackHistory.user_id == current_user_id)
        .group_by(TrackHistory.spotify_id)
        .order_by(text("max_streams DESC"))
        .limit(1)
    ).first()

    if not stats:
        return {"max_streams": 100, "max_minutes": 100}

    return {
        "max_streams": stats[0],
        "max_minutes": round((stats[1] or 0) / 60000)
    }