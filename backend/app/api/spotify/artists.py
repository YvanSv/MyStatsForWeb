from fastapi import APIRouter, Depends, Cookie, HTTPException
from sqlalchemy import desc, asc
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
    # 1. Auth
    user = db.exec(select(User).where(User.session_id == session_id)).first()
    if not user:
        raise HTTPException(status_code=401, detail="Non connecté")

    # 2. Définition des colonnes SQL (Labels)
    plays_col = func.count(TrackHistory.id).label("play_count")
    # On utilise ms_played pour le temps réel
    total_ms_col = func.sum(TrackHistory.ms_played).label("total_ms_real")
    # Calcul de l'engagement réel
    engagement_col = (
        func.sum(TrackHistory.ms_played) * 100.0 / 
        func.nullif(func.sum(Track.duration_ms), 0)
    ).label("engagement")

    # 3. Requête de base
    statement = (
        select(
            Artist.spotify_id,
            Artist.name,
            Artist.image_url,
            plays_col,
            total_ms_col,
            engagement_col
        )
        .join(Track, Artist.spotify_id == Track.artist_id)
        .join(TrackHistory, Track.spotify_id == TrackHistory.spotify_id)
        .where(TrackHistory.user_id == user.id)
        .group_by(Artist.spotify_id, Artist.name, Artist.image_url)
    )

    # 4. Tri dynamique (SQL)
    if sort_by == "play_count":
        order_col = plays_col
    elif sort_by == "total_minutes":
        order_col = total_ms_col
    elif sort_by == "engagement":
        order_col = engagement_col
    else:
        order_col = plays_col

    if direction == "desc":
        statement = statement.order_by(order_col.desc())
    else:
        statement = statement.order_by(order_col.asc())

    results = db.exec(statement).all()

    # 5. Formatage et calcul du Rating
    formatted_artists = []
    for row in results:
        total_mins = (row.total_ms_real or 0) / 60000
        if row.play_count > 0:
            part1 = (total_mins / row.play_count)
            part2 = (total_mins / 100.0) / 100.0 * (2/3)
            rating = round((part1 + part2) * (2/3), 2)
        else: rating = 0

        formatted_artists.append({
            "id": row.spotify_id,
            "name": row.name,
            "image_url": row.image_url,
            "play_count": row.play_count,
            "total_minutes": round(total_mins, 1),
            "rating": rating,
            "engagement": round(row.engagement or 0, 1)
        })

    # 6. Tri Python pour le rating et Pagination finale
    if sort_by == "rating":
        formatted_artists.sort(key=lambda x: x["rating"], reverse=(direction == "desc"))
    
    return formatted_artists[offset : offset + limit]