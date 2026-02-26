from .utils.metadata import get_date_metadata
from app.database import get_session
from app.models import TrackHistory, User, Track, Artist, Album
from typing import Optional
from fastapi import APIRouter, Cookie, Depends, HTTPException
from sqlalchemy import Date, Float, Numeric, cast, func, select, text
from sqlmodel import Session

router = APIRouter()

@router.get('')
async def get_user_musics(
    *,
    session_id: Optional[str] = Cookie(None),
    db: Session = Depends(get_session),
    offset: int = 0,
    limit: int = 50,
    sort: str = "play_count",
    direction: str = "desc",
    track: Optional[str] = "",
    artist: Optional[str] = "",
    album: Optional[str] = "",
    streams_min: Optional[int] = 0,
    streams_max: Optional[int] = None,
    minutes_min: Optional[float] = 0,
    minutes_max: Optional[float] = None,
    rating_min: Optional[float] = 0,
    rating_max: Optional[float] = None,
    engagement_min: Optional[float] = 0,
    engagement_max: Optional[float] = 100,
    date_min: Optional[str] = None,
    date_max: Optional[str] = None,
):
    if not session_id: raise HTTPException(status_code=401, detail="Non connecté")
    user_result = db.exec(select(User).where(User.session_id == session_id)).first()
    if not user_result: raise HTTPException(status_code=401, detail="Utilisateur introuvable")
    if isinstance(user_result, User): current_user_id = user_result.id
    else: current_user_id = user_result[0].id

    raw_ms = cast(func.sum(TrackHistory.ms_played), Float)
    raw_duration = func.nullif(cast(func.sum(Track.duration_ms), Float), 0)
    play_count = func.count(TrackHistory.id)

    mins_calc = raw_ms / 60000.0
    eng_calc = raw_ms / raw_duration

    total_minutes = func.round(cast(mins_calc, Numeric)).label("total_minutes")
    engagement = func.round(cast(eng_calc * 100, Numeric), 2).label("engagement")

    rating_formula = ((eng_calc * mins_calc / (20.0 * func.nullif(play_count, 0)) + (mins_calc / 40.0)) / 8.0)
    rating = func.round(cast(rating_formula, Numeric), 2).label("rating")

    query = (select(
            Track,
            Artist.name.label("artist"),
            Album.name.label("album"),
            Album.image_url.label("cover"),
            play_count,
            total_minutes,
            engagement,
            rating
        )
        .join(Album, Track.album_id == Album.spotify_id)
        .join(Artist, Track.artist_id == Artist.spotify_id)
        .join(TrackHistory, Track.spotify_id == TrackHistory.spotify_id)
        .where(TrackHistory.user_id == current_user_id)
    )
    if track != "": query = query.where(Track.title.ilike(f"%{track}%"))
    if artist != "": query = query.where(Artist.name.ilike(f"%{artist}%"))
    if album != "": query = query.where(Album.name.ilike(f"%{album}%"))
    if date_min: query = query.where(cast(TrackHistory.played_at, Date) >= date_min)
    if date_max: query = query.where(cast(TrackHistory.played_at, Date) <= f"{date_max} 23:59:59")
    query = query.group_by(
        Track.spotify_id,
        Artist.name,
        Album.name,
        Album.image_url
    )
    if streams_min > 0: query = query.having(play_count >= streams_min)
    if streams_max: query = query.having(play_count <= streams_max)
    if minutes_min > 0: query = query.having(total_minutes >= minutes_min)
    if minutes_max is not None: query = query.having(total_minutes <= minutes_max)
    if engagement_min > 0: query = query.having(engagement >= engagement_min )
    if engagement_max < 100: query = query.having(engagement <= engagement_max)
    if rating_min > 0: query = query.having(rating >= rating_min)
    if rating_max is not None: query = query.having(rating <= rating_max)

    cols = {
        "play_count": play_count,
        "total_minutes": total_minutes,
        "engagement": engagement,
        "rating": rating,
        "name": Track.title,
        "id": Track.spotify_id
    }
    # Construction de la hiérarchie selon le choix de l'utilisateur
    sort_hierarchy = []
    if sort == "play_count": sort_hierarchy = [cols["play_count"], cols["total_minutes"], cols["id"]]
    elif sort == "rating": sort_hierarchy = [cols["rating"], cols["engagement"], cols["id"]]
    else: sort_hierarchy = [cols.get(sort, cols["play_count"]), cols["id"]]
    # Application du tri à la requête SQLAlchemy
    if direction == "desc": query = query.order_by(*(c.desc() for c in sort_hierarchy))
    else: query = query.order_by(*(c.asc() for c in sort_hierarchy))
    # Pagination
    query = query.offset(offset).limit(limit)
    results = db.exec(query).all()

    all_tracks = []
    for row in results:
        track_obj, artist_name, album_name, cover_url, count, mins, eng, rating = row
        all_tracks.append({
            "spotify_id": track_obj.spotify_id,
            "title": track_obj.title,
            "artist": artist_name,
            "album": album_name,
            "cover": cover_url,        
            "duration_ms": track_obj.duration_ms,
            "play_count": count,
            "total_minutes": mins or 0,
            "engagement": min(eng or 0, 100),
            "rating": rating or 0
        })

    return all_tracks

@router.get('/metadata')
async def get_user_tracks_metadata(*, session_id: Optional[str] = Cookie(None), db: Session = Depends(get_session)):
    if not session_id: raise HTTPException(status_code=401, detail="Non connecté")
    # Identification de l'utilisateur
    user = db.exec(select(User).where(User.session_id == session_id)).first()
    if not user: raise HTTPException(status_code=401, detail="Utilisateur introuvable")
    current_user_id = user.id

    # On calcule les agrégations pour chaque track unique
    raw_ms = cast(func.sum(TrackHistory.ms_played), Float)
    raw_duration = func.nullif(cast(func.sum(Track.duration_ms), Float), 0)
    play_count_sql = func.count(TrackHistory.id)
    
    mins_calc = raw_ms / 60000.0
    eng_calc = raw_ms / raw_duration
    
    rating_formula = ((eng_calc * mins_calc / (20.0 * func.nullif(play_count_sql, 0)) + (mins_calc / 40.0)) / 8.0)

    # On groupe par track pour avoir les stats individuelles
    stats_subquery = (
        select(
            play_count_sql.label("c"),
            mins_calc.label("m"),
            rating_formula.label("r")
        )
        .join(Track, Track.spotify_id == TrackHistory.spotify_id)
        .where(TrackHistory.user_id == current_user_id)
        .group_by(Track.spotify_id)
    ).subquery()

    # Requête finale pour extraire les MAX et les bornes de DATES
    metadata_query = select(
        func.max(stats_subquery.c), # Max streams
        func.max(stats_subquery.m), # Max minutes
        func.max(stats_subquery.r), # Max rating
        func.min(cast(TrackHistory.played_at, Date)), # Date min
        func.max(cast(TrackHistory.played_at, Date))  # Date max
    )
    
    res = db.exec(metadata_query).first()
    
    # Extraction et gestion des valeurs nulles (si historique vide)
    count = res[0] or 0
    mins = res[1] or 0
    max_rating = res[2] or 0
    date_min = str(res[3]) if res[3] else "1890-01-01"
    date_max = str(res[4]) if res[4] else "2026-12-31"

    return {
        "max_streams": count,
        "max_minutes": round(mins),
        "max_rating": round(max_rating + 0.05, 2),
        "date_min": date_min,
        "date_max": date_max
    }