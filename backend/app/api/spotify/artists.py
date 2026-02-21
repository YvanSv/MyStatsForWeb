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

@router.get("/metadata")
async def get_artists_metadata(db: Session = Depends(get_session),session_id: Optional[str] = Cookie(None)):
    if not session_id: raise HTTPException(status_code=401, detail="Non connecté")
    user_result = db.exec(select(User).where(User.session_id == session_id)).first()
    if not user_result: raise HTTPException(status_code=401, detail="Utilisateur introuvable")
    if isinstance(user_result, User): current_user_id = user_result.id
    else: current_user_id = user_result[0].id
    
    # On cherche le max d'écoutes et le max de minutes via TrackHistory
    # Groupé par artist pour trouver le record absolu de l'utilisateur
    stats = db.exec(
        select(
            func.count(TrackHistory.id).label("max_streams"),
            func.sum(TrackHistory.ms_played).label("max_ms")
        )
        .join(Track, Track.spotify_id == TrackHistory.spotify_id)
        .join(Artist, Artist.spotify_id == Track.artist_id)
        .where(TrackHistory.user_id == current_user_id)
        .group_by(Artist.spotify_id)
        .order_by(text("max_streams DESC"))
        .limit(1)
    ).first()

    if not stats: return {"max_streams": 100, "max_minutes": 100}

    return {
        "max_streams": stats[0],
        "max_minutes": round(stats[1] / 60000)
    }