from fastapi import APIRouter, Depends, Cookie, HTTPException
from sqlmodel import Session, select, func
from typing import Optional
from app.database import get_session
from app.models import User, Artist, Track, TrackHistory

router = APIRouter()

@router.get("/")
async def get_artists(
    offset: int = 0,
    limit: int = 50,
    sort_by: str = "play_count",
    direction: str = "desc",
    session_id: Optional[str] = Cookie(None),
    db: Session = Depends(get_session)
):
    # 1. Récupération de l'utilisateur via la session
    user = db.exec(select(User).where(User.session_id == session_id)).first()
    if not user:
        raise HTTPException(status_code=401, detail="Non connecté")

    # 2. Construction de la requête ultra-optimisée
    # On définit les colonnes de calcul
    plays_col = func.count(TrackHistory.id).label("play_count")
    duration_col = func.sum(Track.duration_ms).label("total_ms")

    # Requête de base avec jointures
    statement = (
        select(
            Artist.spotify_id,
            Artist.name,
            Artist.image_url,
            plays_col,
            duration_col
        )
        .join(Track, Artist.spotify_id == Track.artist_id)
        .join(TrackHistory, Track.spotify_id == TrackHistory.spotify_id)
        .where(TrackHistory.user_id == user.id)
        .group_by(Artist.spotify_id, Artist.name, Artist.image_url)
    )

    # 3. Gestion du tri dynamique
    if sort_by == "play_count":
        order_col = plays_col
    elif sort_by == "total_minutes":
        order_col = duration_col
    else:
        order_col = plays_col # Par défaut

    if direction == "desc":
        statement = statement.order_by(order_col.desc())
    else:
        statement = statement.order_by(order_col.asc())

    # Exécution
    results = db.exec(statement).all()

    # 5. Formatage de la réponse
    formatted_artists = []
    for row in results:
        avg_minutes_per_play = (row.total_ms / 60000) / row.play_count if row.play_count > 0 else 0

        if row.play_count > 0:
            part1 = int(((row.total_ms or 0) / 60000) / row.play_count * 100) / 100.0
            part2 = (int((row.total_ms or 0) / 60000 / 100.0) / 100.0) * (2/3)
            rating = round((part1 + part2) * (2/3), 2)
        else: rating = 0

        engagement = min(round((avg_minutes_per_play / 3.5) * 100), 100)

        formatted_artists.append({
            "id": row.spotify_id,
            "name": row.name,
            "image_url": row.image_url,
            "play_count": row.play_count,
            "total_minutes": (row.total_ms or 0) / 60000,
            "rating": rating,
            "engagement": engagement
        })

    if sort_by in ["rating", "engagement"]:
        formatted_artists.sort(key=lambda x: x[sort_by], reverse=(direction == "desc"))
    return formatted_artists[offset : offset + limit]