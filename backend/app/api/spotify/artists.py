from fastapi import APIRouter, Cookie, Depends, HTTPException
import httpx
from sqlmodel import Session, select, func, desc, asc
from typing import Optional
from app.database import get_session
from app.models import User, Track, TrackHistory, Artist
from app.auth import get_valid_access_token

router = APIRouter()

@router.get("/")
async def get_user_artists(
    offset: int = 0,
    limit: int = 20,
    sort_by: str = "play_count", # play_count, name, total_minutes, engagement, rating
    direction: str = "desc",    # desc, asc
    session_id: Optional[str] = Cookie(None),
    db: Session = Depends(get_session)
):
    # 1. Authentification
    if not session_id: raise HTTPException(status_code=401, detail="Non connecté")
    user = db.exec(select(User).where(User.session_id == session_id)).first()
    if not user: raise HTTPException(status_code=401, detail="Utilisateur introuvable")

    # 2. Construction de la requête SQL
    statement = (
        select(
            Artist,
            func.count(TrackHistory.id).label("plays"),
            func.sum(Track.duration_ms).label("duration")
        )
        .join(Track, Artist.spotify_id == Track.artist_id)
        .join(TrackHistory, Track.spotify_id == TrackHistory.spotify_id)
        .where(TrackHistory.user_id == user.id)
        .group_by(Artist.spotify_id)
    )

    # 3. Application du tri SQL pour les champs natifs
    if sort_by == "play_count": statement = statement.order_by(desc("plays") if direction == "desc" else asc("plays"))
    elif sort_by == "total_minutes": statement = statement.order_by(desc("duration") if direction == "desc" else asc("duration"))
    elif sort_by == "name": statement = statement.order_by(desc(Artist.name) if direction == "desc" else asc(Artist.name))

    results = db.exec(statement).all()

    access_token = None
    all_artists = []

    # 4. Traitement des données et calculs (Rating & Engagement)
    for row in results:
        artist_obj, play_count, total_ms_real = row
        total_minutes = (total_ms_real or 0) / 60000
        
        # --- Calcul de l'engagement ---
        duration_theorique_ms = total_ms_real 
        engagement = 100
        if duration_theorique_ms > 0:
            engagement = round(min(total_ms_real, duration_theorique_ms) / duration_theorique_ms * 100)

        # --- Calcul du Rating ---
        if play_count > 0:
            part1 = int(1.0 * total_minutes / play_count * 100) / 100.0
            part2 = (int(total_minutes / 100.0) / 100.0) * (2/3)
            rating = round((part1 + part2) * (2/3), 2)
        else: rating = 0

        # --- Lazy loading de l'image si nécessaire ---
        if not artist_obj.image_url:
            if not access_token: access_token = await get_valid_access_token(user, db)
            try:
                async with httpx.AsyncClient() as client:
                    res = await client.get(
                        f"https://api.spotify.com/v1/artists/{artist_obj.spotify_id}",
                        headers={"Authorization": f"Bearer {access_token}"},
                        timeout=2.0
                    )
                    if res.status_code == 200:
                        imgs = res.json().get("images", [])
                        if imgs:
                            artist_obj.image_url = imgs[0]["url"]
                            db.add(artist_obj)
                            db.commit()
                            db.refresh(artist_obj)
            except: pass

        all_artists.append({
            "id": artist_obj.spotify_id,
            "name": artist_obj.name,
            "image_url": artist_obj.image_url,
            "play_count": play_count,
            "total_minutes": round(total_minutes, 1),
            "engagement": engagement,
            "rating": rating
        })

    # 5. Tri Python pour les champs calculés (Rating et Engagement)
    if sort_by in ["rating", "engagement"]:
        all_artists.sort(key=lambda x: x[sort_by], reverse=(direction == "desc"))

    # 6. Pagination finale
    return all_artists[offset : offset + limit]