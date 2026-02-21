from fastapi import APIRouter, Depends, Cookie, HTTPException
from sqlalchemy import Float, cast, desc, asc, text
from sqlmodel import Session, select, func
from typing import Optional
from app.database import get_session
from app.models import User, Artist, Track, TrackHistory

router = APIRouter()

@router.get("/")
async def get_artists(
    *,
    session_id: Optional[str] = Cookie(None),
    db: Session = Depends(get_session),
    offset: int = 0,
    limit: int = 50,
    sort_by: str = "play_count",
    direction: str = "desc",
    # Paramètres de recherche
    artist: Optional[str] = None,
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
    # 1. Auth
    if not session_id: raise HTTPException(status_code=401, detail="Non connecté")
    user = db.exec(select(User).where(User.session_id == session_id)).first()
    if not user: raise HTTPException(status_code=401, detail="Utilisateur introuvable")
    if isinstance(user, User): current_user_id = user.id
    else: current_user_id = user[0].id

    play_count = func.count(TrackHistory.id).label("play_count")
    total_minutes = (cast(func.sum(TrackHistory.ms_played), Float) / 60000).label("total_minutes")

    query = (
        select(Artist,play_count,total_minutes)
        .join(Track, Artist.spotify_id == Track.artist_id)
        .join(TrackHistory, Track.spotify_id == TrackHistory.spotify_id)
        .where(TrackHistory.user_id == current_user_id)
    )
    if artist: query = query.where(Artist.name.ilike(f"%{artist}%"))

    query = query.group_by(Artist.spotify_id, Artist.name, Artist.image_url)

    if streams_min is not None: query = query.having(func.count(TrackHistory.id) >= streams_min)
    if streams_max is not None: query = query.having(func.count(TrackHistory.id) <= streams_max)
    if minutes_min is not None: query = query.having(total_minutes >= minutes_min)
    if minutes_max is not None: query = query.having(total_minutes <= minutes_max)
    
    order = text(f"{sort_by} {direction}")
    query = query.order_by(order)
    results = db.exec(query).all()

    all_artists = []
    for row in results:
        artist_obj = row[0]
        play_count = row[1]
        temps_total = row[2] or 0
        
        # Engagement
        engagement = 0
        # duration_theorique_min = play_count * artist_obj.duration_ms / 60000
        # if duration_theorique_min > 0:
            # engagement = round(min(temps_total, duration_theorique_min) / duration_theorique_min * 100)

        if (engagement_min and engagement < engagement_min) or (engagement_max and engagement > engagement_max): continue

        # Rating
        rating = 0
        if play_count > 0:
            part1 = temps_total / play_count
            part2 = temps_total / 6666.66
            rating = round((part1 + part2) * 0.66, 2)

        if (rating_min and rating < rating_min) or (rating_max and rating > rating_max): continue

        all_artists.append({
            "id": artist_obj.spotify_id,
            "name": artist_obj.name,
            "image_url": artist_obj.image_url,
            "play_count": play_count,
            "total_minutes": round(temps_total),
            "engagement": engagement,
            "rating": rating
        })

    # 4. Tri Python pour les colonnes calculées
    if sort_by in ["rating", "engagement"]:
        all_artists.sort(key=lambda x: x[sort_by], reverse=(direction == "desc"))

    return all_artists[offset : offset + limit]

    #####################################################################################""

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