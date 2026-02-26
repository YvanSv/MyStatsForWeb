from fastapi import APIRouter, Depends, Cookie, HTTPException
from sqlalchemy import Date, Float, Numeric, case, cast, text
from sqlmodel import Session, select, func
from typing import Optional
from app.database import get_session
from app.models import User, Artist, Track, TrackHistory
from .utils.metadata import get_date_metadata

router = APIRouter()

@router.get('')
async def get_artists(
    *,
    session_id: Optional[str] = Cookie(None),
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
    if not session_id: raise HTTPException(status_code=401, detail="Non connecté")
    user = db.exec(select(User).where(User.session_id == session_id)).first()
    if not user: raise HTTPException(status_code=401, detail="Utilisateur introuvable")
    current_user_id = user.id

    raw_ms = cast(func.sum(TrackHistory.ms_played), Float)
    raw_duration = func.nullif(cast(func.sum(Track.duration_ms), Float), 0)
    play_count = func.count(TrackHistory.id)

    mins_calc = raw_ms / 60000.0
    eng_calc = raw_ms / raw_duration

    total_minutes = func.round(cast(mins_calc, Numeric)).label("total_minutes")
    engagement = func.round(cast(eng_calc * 100, Numeric), 2).cast(Numeric(10, 2)).label("engagement")

    safe_mins = func.greatest(mins_calc, 0.00001)
    rating_formula = (((eng_calc / (7.0 * func.nullif(play_count, 0))) + 
            (func.log(safe_mins) / 25.0)
        ) * 4.0 + (play_count * eng_calc / 10000.0)
    )
    rating = case(
        (play_count > 1, func.round(cast(rating_formula, Numeric), 2)),
        else_=0.0
    ).label("rating")

    query = (
        select(
            Artist,
            play_count,
            total_minutes,
            engagement,
            rating
        )
        .join(Track, Artist.spotify_id == Track.artist_id)
        .join(TrackHistory, Track.spotify_id == TrackHistory.spotify_id)
        .where(TrackHistory.user_id == current_user_id)
    )
    if artist: query = query.where(Artist.name.ilike(f"%{artist}%"))
    if date_min: query = query.where(cast(TrackHistory.played_at, Date) >= date_min)
    if date_max: query = query.where(cast(TrackHistory.played_at, Date) <= f"{date_max} 23:59:59")
    query = query.group_by(Artist.spotify_id, Artist.name, Artist.image_url)
    if streams_min > 0: query = query.having(play_count >= streams_min)
    if streams_max is not None: query = query.having(play_count <= streams_max)
    if minutes_min > 0: query = query.having(total_minutes >= minutes_min)
    if minutes_max is not None: query = query.having(total_minutes <= minutes_max)
    if engagement_min > 0: query = query.having(engagement >= engagement_min)
    if engagement_max < 100: query = query.having(engagement <= engagement_max)
    if rating_min > 0: query = query.having(rating >= rating_min)
    if rating_max is not None: query = query.having(rating <= rating_max)
    cols = {
        "play_count": play_count,
        "total_minutes": total_minutes,
        "engagement": engagement,
        "rating": rating,
        "name": Artist.name,
        "id": Artist.spotify_id
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

    all_artists = []
    for row in results:
        artist_obj, count, mins, eng, rating = row
        all_artists.append({
            "id": artist_obj.spotify_id,
            "name": artist_obj.name,
            "image_url": artist_obj.image_url,
            "play_count": count,
            "total_minutes": mins,
            "engagement": eng,
            "rating": rating or 0
        })
    return all_artists

@router.get('/metadata')
async def get_artists_metadata(*, session_id: Optional[str] = Cookie(None), db: Session = Depends(get_session)):
    if not session_id: raise HTTPException(status_code=401, detail="Non connecté")
    current_user_id = db.exec(select(User.id).where(User.session_id == session_id)).first()
    if current_user_id is None: raise HTTPException(status_code=401, detail="Utilisateur introuvable")
    current_user_id = int(current_user_id)

    raw_ms = cast(func.sum(TrackHistory.ms_played), Float)
    raw_duration = func.nullif(cast(func.sum(Track.duration_ms), Float), 0)
    play_count_sql = func.count(TrackHistory.id)
    mins_calc = raw_ms / 60000.0
    eng_calc = raw_ms / raw_duration
    rating_formula = (
        ((eng_calc / (7.0 * func.nullif(play_count_sql, 0))) + (func.log(func.greatest(mins_calc, 0.001)) / 25.0)) 
        * 4.0 + (play_count_sql * eng_calc / 10000.0)
    )

    stats_subquery = (
        select(
            play_count_sql.label("c"),
            mins_calc.label("m"),
            rating_formula.label("r")
        )
        .select_from(Artist) 
        .join(Track, Artist.spotify_id == Track.artist_id)
        .join(TrackHistory, Track.spotify_id == TrackHistory.spotify_id)
        .where(TrackHistory.user_id == current_user_id)
        .group_by(Artist.spotify_id)
    ).subquery()

    metadata_query = select(
        func.max(stats_subquery.c.c),
        func.max(stats_subquery.c.m),
        func.max(stats_subquery.c.r),
        select(func.min(cast(TrackHistory.played_at, Date))).where(TrackHistory.user_id == current_user_id).scalar_subquery(),
        select(func.max(cast(TrackHistory.played_at, Date))).where(TrackHistory.user_id == current_user_id).scalar_subquery()
    )
    
    res = db.exec(metadata_query).first()
    
    return {
        "max_streams": res[0] or 0,
        "max_minutes": round(res[1] or 0),
        "max_rating": round((res[2] or 0) + 0.05, 2),
        "date_min": str(res[3]) if res[3] else "1890-01-01",
        "date_max": str(res[4]) if res[4] else "2026-12-31"
    }