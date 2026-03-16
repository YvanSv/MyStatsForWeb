import datetime
from fastapi import Depends
from sqlalchemy import Float, Numeric, asc, case, cast, desc, func, select
from sqlmodel import Session
from app.database import get_session
from app.models import Album, Artist, Track, TrackHistory

def get_formulas():
    raw_ms = cast(func.sum(TrackHistory.ms_played), Float)
    raw_duration = func.nullif(cast(func.sum(Track.duration_ms), Float), 0)
    cnt = func.count(TrackHistory.id)
    
    m = raw_ms / 60000.0
    e = raw_ms / raw_duration
    
    f_track = ((e * m / (20.0 * func.nullif(cnt, 0)) + (m / 40.0)) / 8.0)
    f_album = (e * m / (7.0 * func.nullif(cnt, 0)) + (e * m / 3200.0)) * 1.75 * e
    f_artist = (((e / (7.0 * func.nullif(cnt, 0))) + (func.log(func.greatest(m, 0.001)) / 25.0)) * 4.0 + (cnt * e / 10000.0))
    
    return f_track, f_album, f_artist

def get_generic_metadata(db: Session, user_id: int, group_col, rating_expression):
    """
    Calcule les métadonnées max (streams, minutes, rating) et les bornes temporelles
    en fonction de la colonne de regroupement fournie.
    """
    # Mesures de base communes
    raw_ms = cast(func.sum(TrackHistory.ms_played), Float)
    raw_duration = func.nullif(cast(func.sum(Track.duration_ms), Float), 0)
    cnt = func.count(TrackHistory.id)
    mins_calc = raw_ms / 60000.0
    eng_calc = raw_ms / raw_duration

    # Sous-requête
    stats_subq = (
        select(
            cnt.label("c"),
            mins_calc.label("m"),
            rating_expression.label("r"),
            func.min(func.min(func.date(TrackHistory.played_at))).over().label("d_min"),
            func.max(func.max(func.date(TrackHistory.played_at))).over().label("d_max")
        )
        .join(Track, Track.spotify_id == TrackHistory.spotify_id)
        .where(TrackHistory.user_id == user_id)
        .group_by(group_col)
    ).subquery()

    # Agrégation finale des MAX
    res = db.exec(
        select(
            func.max(stats_subq.c.c),
            func.max(stats_subq.c.m),
            func.max(stats_subq.c.r),
            func.min(stats_subq.c.d_min),
            func.max(stats_subq.c.d_max)
        )
    ).first()

    max_c, max_m, max_r, d_min, d_max = res if res else (0, 0, 0, None, None)

    return {
        "max_streams": max_c or 0,
        "max_minutes": round(max_m or 0),
        "max_rating": round((max_r or 0) + 0.05, 2),
        "date_min": str(d_min) if d_min else "1890-01-01",
        "date_max": str(d_max) if d_max else "2026-12-31"
    }

def get_entity_stats(db, user_id, base_model, group_col, rating_formula, filters, search_filters):
    raw_ms = cast(func.sum(TrackHistory.ms_played), Float)
    raw_duration = func.nullif(cast(func.sum(Track.duration_ms), Float), 0)
    
    # On définit les expressions avec leurs labels
    cnt_expr = func.count(TrackHistory.id).label("play_count")
    mins_expr = func.round(cast(raw_ms / 60000.0, Numeric)).label("total_minutes")
    eng_expr = func.round(cast((raw_ms / raw_duration) * 100, Numeric), 2).label("engagement")
    
    rating_expr = case(
        (func.count(TrackHistory.id) > 5, func.round(cast(rating_formula, Numeric), 2)), 
        else_=0.0
    ).label("rating")

    query = select(base_model, cnt_expr, mins_expr, eng_expr, rating_expr)
    # 2. On gère les jointures selon le modèle
    if base_model == Track: query = query.join(TrackHistory, TrackHistory.spotify_id == Track.spotify_id)
        
    elif base_model == Album:
        query = query.join(Track, Track.album_id == Album.spotify_id)
        query = query.join(TrackHistory, TrackHistory.spotify_id == Track.spotify_id)
        
    elif base_model == Artist:
        query = query.join(Track, Track.artist_id == Artist.spotify_id)
        query = query.join(TrackHistory, TrackHistory.spotify_id == Track.spotify_id)

    # 3. On applique le filtre de sécurité
    query = query.where(TrackHistory.user_id == user_id)

    # Application des filtres de recherche (title, artist, dates)
    for f in search_filters: query = query.where(f)

    query = query.group_by(group_col)

    # Filtres HAVING (min/max)
    if filters.get('streams_min', 0) > 0: query = query.having(cnt_expr >= filters['streams_min'])
    if filters.get('streams_max', 0): query = query.having(cnt_expr <= filters['streams_max'])
    if filters.get('minutes_min', 0) > 0: query = query.having(mins_expr >= filters['minutes_min'])
    if filters.get('minutes_max', 0): query = query.having(mins_expr <= filters['minutes_max'])
    if filters.get('engagement_min', 0) > 0: query = query.having(eng_expr >= filters['engagement_min'])
    if filters.get('engagement_max', 0) < 100: query = query.having(eng_expr <= filters['engagement_max'])
    if filters.get('rating_min', 0) > 0: query = query.having(rating_expr >= filters['rating_min'])
    if filters.get('rating_max', 0): query = query.having(rating_expr <= filters['rating_max'])

    # Logique de tri
    cols = {"play_count": cnt_expr, "total_minutes": mins_expr, "engagement": eng_expr, "rating": rating_expr, "id": group_col}
    sort_h = [cols.get(filters['sort'], cnt_expr), cols["total_minutes"], cols["id"]]
    order_func = desc if filters['direction'] == "desc" else asc
    query = query.order_by(*(order_func(c) for c in sort_h))

    return db.exec(query.offset(filters['offset']).limit(filters['limit'])).all()

def get_date_metadata(db: Session = Depends(get_session), current_user_id: str = ""):
    # Bornes temporelles basées sur l'HISTORIQUE d'écoute (played_at)
    # On récupère le tout premier et le tout dernier stream de l'utilisateur
    history_dates = db.exec(
        select(
            func.min(TrackHistory.played_at).label("first_listen"),
            func.max(TrackHistory.played_at).label("last_listen")
        )
        .where(TrackHistory.user_id == current_user_id)
    ).first()

    if not history_dates: return {"date_min": "1890-01-01", "date-max": datetime.datetime.now().strftime("%Y-%m-%d")}

    # Formatage des dates pour l'input HTML (YYYY-MM-DD)
    d_min = history_dates[0].strftime("%Y-%m-%d") if history_dates and history_dates[0] else "2020-01-01"
    d_max = history_dates[1].strftime("%Y-%m-%d") if history_dates and history_dates[1] else datetime.datetime.now().strftime("%Y-%m-%d")
    return {"date_min": d_min, "date_max": d_max}