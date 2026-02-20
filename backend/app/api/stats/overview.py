import random
from fastapi import APIRouter, Depends, Cookie
from sqlalchemy import desc
from sqlmodel import Session, select, func
from app.database import get_session
from app.models import User, Track, TrackHistory, Artist, Album

router = APIRouter()

@router.get("/stats/overview")
async def get_stats_overview(session_id: str = Cookie(None), db: Session = Depends(get_session)):
    user = db.exec(select(User).where(User.session_id == session_id)).first()
    if not user: return {"error": "Unauthorized"}

    # --- 1.1. Nombre d'écoutes ---
    total_listenings = db.exec(select(func.count(TrackHistory.id)).where(TrackHistory.user_id == user.id)).one()
    # --- 1.2. Temps d'écoute total ---
    total_ms = db.exec(select(func.sum(TrackHistory.ms_played)).where(TrackHistory.user_id == user.id)).one() or 0
    total_minutes = round(total_ms / 60000, 1)
    # --- 1.3. Nombre d'artistes ---
    total_artistes = db.exec(
        select(func.count(func.distinct(Track.artist_id)))
        .join(TrackHistory, Track.spotify_id == TrackHistory.spotify_id)
        .where(TrackHistory.user_id == user.id)
    ).one() or 0
    # --- 1.4. Nombre d'albums ---
    total_albums = db.exec(
        select(func.count(func.distinct(Album.spotify_id)))
        .join(Track, Album.spotify_id == Track.album_id)
        .join(TrackHistory, Track.spotify_id == TrackHistory.spotify_id)
        .where(TrackHistory.user_id == user.id)
    ).one() or 0
    # --- 1.5. Nombre de musiques différentes ---
    total_musics_diff = db.exec(
        select(func.count(func.distinct(TrackHistory.spotify_id)))
        .where(TrackHistory.user_id == user.id)
    ).one() or 0

    # --- 2.1. Top Titre (le plus écouté) ---
    top_track_ecoutes_totales_stmt = (
        select(Track, func.count(TrackHistory.id).label("count"))
        .join(TrackHistory, Track.spotify_id == TrackHistory.spotify_id)
        .where(TrackHistory.user_id == user.id)
        .group_by(Track.spotify_id)
        .order_by(desc("count"))
        .limit(1)
    )
    top_track_ecoutes_totales_res = db.exec(top_track_ecoutes_totales_stmt).first()
    # --- 2.2. Top Titre (le plus durée) ---
    top_track_duree_stmt = (
        select(Track, func.sum(TrackHistory.ms_played).label("total_time"))
        .join(TrackHistory, Track.spotify_id == TrackHistory.spotify_id)
        .where(TrackHistory.user_id == user.id)
        .group_by(Track.spotify_id)
        .order_by(desc("total_time"))
        .limit(1)
    )
    top_track_duree_res = db.exec(top_track_duree_stmt).first()

    # --- 2.3. Top Artiste (le plus de temps passé) ---
    top_artist_stmt = (
        select(Artist, func.sum(TrackHistory.ms_played).label("time"))
        .join(Track, Artist.spotify_id == Track.artist_id)
        .join(TrackHistory, Track.spotify_id == TrackHistory.spotify_id)
        .where(TrackHistory.user_id == user.id)
        .group_by(Artist.spotify_id)
        .order_by(desc("time"))
        .limit(1)
    )
    top_artist_temps = db.exec(top_artist_stmt).first()

    # --- 2.4. Top Artiste (le plus d'écoutes distinctes) ---
    top_artist_stmt = (
        select(Artist, func.count(TrackHistory.id).label("play_count"))
        .join(Track, Artist.spotify_id == Track.artist_id)
        .join(TrackHistory, Track.spotify_id == TrackHistory.spotify_id)
        .where(TrackHistory.user_id == user.id)
        .group_by(Artist.spotify_id)
        .order_by(desc("play_count"))
        .limit(1)
    )
    top_artist_ecoutes = db.exec(top_artist_stmt).first()

    # --- 2.5. Album avec le plus grand nombre d'écoutes ---
    top_album_count_stmt = (
        select(
            Album, 
            func.count(TrackHistory.id).label("play_count")
        )
        .join(Track, Album.spotify_id == Track.album_id)
        .join(TrackHistory, Track.spotify_id == TrackHistory.spotify_id)
        .where(TrackHistory.user_id == user.id)
        .group_by(Album.spotify_id)
        .order_by(desc("play_count"))
        .limit(1)
    )
    top_album_count_res = db.exec(top_album_count_stmt).first()

    # --- 2.6. Album avec le plus grand temps d'écoute réel ---
    top_album_time_stmt = (
        select(
            Album, 
            func.sum(TrackHistory.ms_played).label("total_time_ms")
        )
        .join(Track, Album.spotify_id == Track.album_id)
        .join(TrackHistory, Track.spotify_id == TrackHistory.spotify_id)
        .where(TrackHistory.user_id == user.id)
        .group_by(Album.spotify_id)
        .order_by(desc("total_time_ms"))
        .limit(1)
    )
    top_album_time_res = db.exec(top_album_time_stmt).first()

    pool = [
        {"title": "Nombre d'écoutes", "value": f"{total_listenings}", "detail": "titres streamés", "type": "stat"},
        {"title": "Temps d'écoute", "value": f"{int(total_minutes)}", "detail": "minutes au total", "type": "stat"},
        {"title": "Artistes découverts", "value": f"{total_artistes}", "detail": "artistes différents", "type": "stat"},
        {"title": "Discothèque", "value": f"{total_albums}", "detail": "albums explorés", "type": "stat"},
        {"title": "Bibliothèque", "value": f"{total_musics_diff}", "detail": "musiques uniques", "type": "stat"}
    ]

    # Ajout des Tops (si les résultats existent)
    if top_track_ecoutes_totales_res:
        pool.append({
            "title": "Titre le plus écouté", 
            "value": top_track_ecoutes_totales_res[0].title, 
            "detail": f"{top_track_ecoutes_totales_res[1]} fois", 
            "type": "song"
        })

    if top_track_duree_res and top_track_duree_res[1] is not None:
        pool.append({
            "title": "Plus gros temps d'écoute", 
            "value": top_track_duree_res[0].title, 
            "detail": f"{int(top_track_duree_res[1]/60000)} min", 
            "type": "song"
        })

    if top_album_count_res:
        pool.append({
            "title": "Album favori (Volume)", 
            "value": top_album_count_res[0].name, 
            "detail": f"{top_album_count_res[1]} écoutes", 
            "type": "album"
        })

    if top_album_time_res and top_album_time_res[1] is not None:
        # On calcule les minutes en toute sécurité
        minutes_album = int(top_album_time_res[1] / 60000)
        pool.append({
            "title": "Album favori (Temps)", 
            "value": top_album_time_res[0].name, 
            "detail": f"{minutes_album} min", 
            "type": "album"
        })

    if top_artist_ecoutes:
        pool.append({
            "title": "Artiste n°1", 
            "value": top_artist_ecoutes[0].name, 
            "detail": f"{top_artist_ecoutes[1]} streams", 
            "type": "artist"
        })

    return random.sample(pool, min(len(pool), 3))