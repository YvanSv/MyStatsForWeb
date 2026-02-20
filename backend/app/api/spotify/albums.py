from app.database import get_session
from app.models import TrackHistory, User, Track, Artist, Album
from typing import Optional
from fastapi import APIRouter, Cookie, Depends, HTTPException
from sqlalchemy import desc, asc, func, select
from sqlmodel import Session

router = APIRouter()

@router.get("/")
async def get_user_albums(
    offset: int = 0,
    limit: int = 50,
    sort_by: str = "play_count",
    direction: str = "desc",
    session_id: Optional[str] = Cookie(None),
    db: Session = Depends(get_session)
):
    if not session_id: 
        raise HTTPException(status_code=401, detail="Non connecté")
    
    # Auth sécurisée
    user_obj = db.exec(select(User).where(User.session_id == session_id)).scalar()
    if not user_obj: raise HTTPException(status_code=401, detail="Utilisateur introuvable")
    current_user_id = user_obj.id

    # On récupère les données agrégées
    # total_ms_real = temps d'écoute effectif
    # total_ms_theorique = play_count * duration (si tout était écouté en entier)
    statement = (
        select(
            Album,
            Artist.name.label("artist_name"),
            func.count(TrackHistory.id).label("play_count"),
            func.sum(Track.duration_ms).label("total_ms_real") 
        )
        .join(Track, Album.spotify_id == Track.album_id)
        .join(Artist, Album.artist_id == Artist.spotify_id)
        .join(TrackHistory, Track.spotify_id == TrackHistory.spotify_id)
        .where(TrackHistory.user_id == current_user_id)
        .group_by(Album.spotify_id, Artist.name)
    )

    # Tri SQL pour les colonnes natives
    if sort_by == "play_count":
        statement = statement.order_by(desc("play_count") if direction == "desc" else asc("play_count"))
    elif sort_by == "total_minutes":
        statement = statement.order_by(desc("total_ms_real") if direction == "desc" else asc("total_ms_real"))
    elif sort_by == "name":
        statement = statement.order_by(desc(Album.name) if direction == "desc" else asc(Album.name))

    results = db.exec(statement).all()

    all_albums = []
    for row in results:
        album_obj, artist_name, play_count, total_ms_real = row
        total_minutes = (total_ms_real or 0) / 60000
        
        avg_minutes_per_play = total_minutes / play_count if play_count > 0 else 0
        engagement = min(round((avg_minutes_per_play / 3.5) * 100), 100)

        if play_count > 0:
            part1 = int((engagement / 100.0) * (total_minutes / play_count) * 100) / 100.0
            part2 = int(total_minutes / 100.0) / 100.0
            rating = round((part1 + part2) * 2 / 3, 2)
        else:
            rating = 0

        all_albums.append({
            "id": album_obj.spotify_id,
            "name": album_obj.name,
            "artist": artist_name,
            "cover": album_obj.image_url,
            "play_count": play_count,
            "total_minutes": round(total_minutes, 1),
            "engagement": engagement,
            "rating": rating
        })

    # Tri Python pour les colonnes calculées
    if sort_by == "rating":
        all_albums.sort(key=lambda x: x["rating"], reverse=(direction == "desc"))

    return all_albums[offset : offset + limit]