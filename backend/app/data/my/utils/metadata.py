import datetime
from fastapi import Depends
from sqlalchemy import Float, Numeric, asc, case, cast, desc, func, select
from sqlmodel import Session
from app.database import get_session
from app.models import Album, Artist, Track, TrackHistory

def get_generic_metadata(db: Session, user_id: int, group_col, rating_expression):
    # 1. Base de la requête (on a toujours besoin de Track pour le rating/duration)
    stats_query = (
        select(
            func.count(TrackHistory.id).label("c"),
            (func.sum(TrackHistory.ms_played) / 60000.0).label("m"),
            rating_expression.label("r")
        )
        .join(Track, Track.id == TrackHistory.track_id)
    )

    # 2. AJOUT DYNAMIQUE DES JOINS
    # On regarde si group_col appartient à Album ou Artist
    # group_col.table.name nous donne le nom de la table SQL
    target_table = getattr(group_col, "table", None)
    
    if target_table is not None:
        if target_table.name == "album":
            stats_query = stats_query.join(Album, Album.id == Track.album_id)
        elif target_table.name == "artist":
            stats_query = stats_query.join(Artist, Artist.id == Track.artist_id)

    # 3. Construction de la sous-requête
    stats_subq = (
        stats_query
        .where(TrackHistory.user_id == user_id)
        .group_by(group_col)
    ).subquery()

    # 4. Calcul des bornes de dates (sur la table history pure)
    dates = db.exec(
        select(
            func.min(TrackHistory.played_at),
            func.max(TrackHistory.played_at)
        ).where(TrackHistory.user_id == user_id)
    ).first()

    # 5. Calcul des plafonds (Max)
    max_stats = db.exec(
        select(
            func.max(stats_subq.c.c),
            func.max(stats_subq.c.m),
            func.max(stats_subq.c.r)
        )
    ).first()

    res_c, res_m, res_r = max_stats if max_stats else (0, 0, 0)
    d_min, d_max = dates if dates else (None, None)

    return {
        "max_streams": res_c or 0,
        "max_minutes": round(float(res_m or 0)),
        "max_rating": round(float(res_r or 0) + 0.05, 2),
        "date_min": d_min.strftime("%Y-%m-%d") if d_min else "2020-01-01",
        "date_max": d_max.strftime("%Y-%m-%d") if d_max else "2026-12-31"
    }

def get_entity_stats(db, user_id, base_model, group_col, rating_formula, filters, search_filters):
    # Expressions de base
    raw_ms = cast(func.sum(TrackHistory.ms_played), Float)
    raw_duration = func.nullif(cast(func.sum(Track.duration_ms), Float), 0)
    
    cnt_expr = func.count(TrackHistory.id).label("play_count")
    mins_expr = func.round(cast(raw_ms / 60000.0, Numeric)).label("total_minutes")
    eng_expr = func.round(cast((raw_ms / raw_duration) * 100, Numeric), 2).label("engagement")
    
    # Rating calculé seulement si > 5 streams pour la pertinence statistique
    rating_expr = case(
        (func.count(TrackHistory.id) > 5, func.round(cast(rating_formula, Numeric), 2)), 
        else_=0.0
    ).label("rating")

    query = select(base_model, cnt_expr, mins_expr, eng_expr, rating_expr)
    
    # --- JOINTURES CORRIGÉES (Utilisation des IDs Integer) ---
    if base_model == Track:
        query = query.join(TrackHistory, TrackHistory.track_id == Track.id)
    elif base_model == Album:
        query = query.join(Track, Track.album_id == Album.id)
        query = query.join(TrackHistory, TrackHistory.track_id == Track.id)
    elif base_model == Artist:
        query = query.join(Track, Track.artist_id == Artist.id)
        query = query.join(TrackHistory, TrackHistory.track_id == Track.id)

    query = query.where(TrackHistory.user_id == user_id)
    for f in search_filters: query = query.where(f)

    query = query.group_by(group_col, base_model.id) # Groupement par ID interne

    # Filtrage HAVING (Performance : exécuté après l'agrégation)
    if filters.get('streams_min'): query = query.having(cnt_expr >= filters['streams_min'])
    if filters.get('streams_max'): query = query.having(cnt_expr <= filters['streams_max'])
    if filters.get('minutes_min'): query = query.having(mins_expr >= filters['minutes_min'])
    if filters.get('minutes_max'): query = query.having(mins_expr <= filters['minutes_max'])
    if filters.get('rating_min'): query = query.having(rating_expr >= filters['rating_min'])
    if filters.get('rating_max'): query = query.having(rating_expr <= filters['rating_max'])
    if (filters.get('engagement_min') or 0) > 0: query = query.having(eng_expr >= filters['engagement_min'])
    if filters.get('engagement_max') is not None and filters['engagement_max'] < 100: query = query.having(eng_expr <= filters['engagement_max'])

    # Tri stable
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