from calendar import monthrange
from typing import Optional
from fastapi import APIRouter, Cookie, Depends, HTTPException
from sqlalchemy import Integer, cast, func, desc
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.auth.utils.auth_utils import get_current_user_id
from app.database import get_session
from app.models import Album, Artist, Track, TrackHistory
from app.response_message import ResumeDataResponse
from app.utils.rating import get_formulas
from app.profile.profile_data import get_user_simple_profile

router = APIRouter()

@router.get("", response_model=ResumeDataResponse)
async def get_resume_data(
    range: str = "year", 
    offset: int = 0,
    sort: str = "streams",
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_session),
    session_id: Optional[str] = Cookie(None)
):
    start_date, end_date = get_range_dates(range,offset)
    f_track, f_album, f_artist = get_formulas()

    # On définit quel critère utiliser pour le desc()
    sort_mapping = {
        "streams": func.count(TrackHistory.id),
        "minutes": func.sum(TrackHistory.ms_played)
    }
    artist_sort = f_artist if sort == "rating" else sort_mapping.get(sort)
    album_sort = f_track if sort == "rating" else sort_mapping.get(sort)
    track_sort = f_album if sort == "rating" else sort_mapping.get(sort)

    # Exécution des tops
    top_artists = get_top_entities(db, user_id, range, start_date, end_date, f_artist, artist_sort, Artist, Artist.spotify_id)
    top_albums = get_top_entities(db, user_id, range, start_date, end_date, f_album, album_sort, Album, Album.spotify_id)
    top_tracks = get_top_entities(db, user_id, range, start_date, end_date, f_track, track_sort, Track, Track.spotify_id)

    # STATS GLOBALES
    total_stats = get_global_stats(db,user_id,range,start_date,end_date)

    if not total_stats: raise HTTPException(status_code=404, detail="No data found for this period")

    return {
        "user": get_user_simple_profile(f"{user_id}",db,session_id),
        "topArtists": top_artists,
        "topTracks": top_tracks,
        "topAlbums": top_albums,
        "minutes": int(total_stats.total_ms / 60000) if total_stats.total_ms else 0,
        "streams": total_stats.total_streams or 0
    }

def get_range_dates(range,offset):
    now = datetime.utcnow()
    start_date, end_date = None, None

    if range == "day":
        target_day = now - timedelta(days=offset)
        start_date = target_day.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = start_date + timedelta(days=1)
        
    elif range == "month":
        # Recul de X mois
        month_idx = (now.month - 1 - offset) % 12 + 1
        year_idx = now.year + (now.month - 1 - offset) // 12
        start_date = datetime(year_idx, month_idx, 1)
        days_in_month = monthrange(year_idx, month_idx)[1]
        end_date = start_date + timedelta(days=days_in_month)

    elif range == "season":
        # Une saison = 3 mois. Offset 0 = saison actuelle.
        current_season_start_month = ((now.month - 1) // 3) * 3 + 1
        target_date = datetime(now.year, current_season_start_month, 1) - timedelta(days=offset * 90)
        start_date = datetime(target_date.year, ((target_date.month - 1) // 3) * 3 + 1, 1)
        end_date = start_date + timedelta(days=92) # Approx 3 mois

    elif range == "year":
        target_year = now.year - offset
        start_date = datetime(target_year, 1, 1)
        end_date = datetime(target_year + 1, 1, 1)
    
    return start_date, end_date

def get_top_entities(db, user_id, range, start, end, rating_f, sort_column, model, id_field, limit=5):
    # 1. On détermine le nom de la clé étrangère dans TrackHistory
    fk_name = "spotify_id" if model == Track else f"{model.__name__.lower()}_id"
    fk_column = getattr(TrackHistory, fk_name)

    img_column = model.image_url if hasattr(model, 'image_url') else Album.image_url
    name_column = model.name if hasattr(model, 'name') else Track.title

    query = (
        db.query(
            name_column.label("name"), 
            img_column.label("image"),
            func.count(TrackHistory.id).label("streams"),
            func.sum(cast(TrackHistory.ms_played / 60000, Integer)).label("minutes"),
            rating_f.label("rating")
        )
    )

    # 3. JOINTURES
    query = query.join(TrackHistory, id_field == fk_column)
    if model == Track: query = query.join(Album, Album.spotify_id == Track.album_id)
    else: query = query.join(Track, Track.spotify_id == TrackHistory.spotify_id)

    # 4. FILTRES
    query = query.filter(TrackHistory.user_id == user_id)
    if range != "lifetime" and start and end: query = query.filter(TrackHistory.played_at >= start, TrackHistory.played_at < end)
    return query.group_by(id_field, name_column, img_column).order_by(desc(sort_column)).limit(limit).all()

def get_global_stats(db,user_id,range,start_date,end_date):
    stats_query = db.query(
        func.sum(TrackHistory.ms_played).label("total_ms"),
        func.count(TrackHistory.id).label("total_streams")
    ).filter(TrackHistory.user_id == user_id)
    
    if range != "lifetime": stats_query = stats_query.filter(TrackHistory.played_at >= start_date, TrackHistory.played_at < end_date)
    return stats_query.first()