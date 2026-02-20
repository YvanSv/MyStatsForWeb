from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException
import httpx
from sqlalchemy import desc, select
from sqlmodel import Session

from app.auth import get_valid_access_token
from app.database import get_session
from app.models import TrackHistory, User

router = APIRouter(prefix="/spotify", tags=["spotify"])

@router.get("/recently-played")
async def get_recently_played(
    offset: int = 0, 
    limit: int = 50, 
    session_id: Optional[str] = Cookie(None), 
    db: Session = Depends(get_session)
): 
    # 1. Vérification de la session
    if not session_id:
        raise HTTPException(status_code=401, detail="Non connecté")

    statement = select(User).where(User.session_id == session_id)
    user = db.exec(statement).scalar()
    if not user: raise HTTPException(status_code=401, detail="Utilisateur introuvable")

    # 2. Synchronisation Spotify (Uniquement si offset 0)
    # On ne synchronise que pour le premier chargement afin de remplir la DB
    if offset == 0:
        access_token = await get_valid_access_token(user, db)
        async with httpx.AsyncClient() as client:
            spotify_res = await client.get(
                "https://api.spotify.com/v1/me/player/recently-played",
                headers={"Authorization": f"Bearer {access_token}"}
            )
        
        if spotify_res.status_code == 200:
            spotify_data = spotify_res.json()
            new_tracks_count = 0
            
            for item in spotify_data.get("items", []):
                track_data = item["track"]
                # On nettoie le format de date Spotify pour Python
                played_at_str = item["played_at"].replace("Z", "+00:00")
                played_at = datetime.fromisoformat(played_at_str)
                
                # Vérifier si l'écoute existe déjà (Clé unique : user + timestamp)
                exists = db.exec(
                    select(TrackHistory).where(
                        TrackHistory.user_id == user.id,
                        TrackHistory.played_at == played_at
                    )
                ).first()

                if not exists:
                    new_entry = TrackHistory(
                        spotify_id=track_data["id"],
                        user_id=user.id,
                        played_at=played_at,
                        title=track_data["name"],
                        artist=", ".join([a["name"] for a in track_data["artists"]]),
                        album=track_data["album"]["name"],
                        cover=track_data["album"]["images"][0]["url"] if track_data["album"]["images"] else ""
                    )
                    db.add(new_entry)
                    new_tracks_count += 1
            
            if new_tracks_count > 0:
                db.commit()

    # 3. Récupération des données paginées depuis la DB
    # On trie toujours par date décroissante pour avoir les derniers écoutés en premier
    statement = (
        select(TrackHistory)
        .where(TrackHistory.user_id == user.id)
        .order_by(desc(TrackHistory.played_at))
        .offset(offset)
        .limit(limit)
    )
    
    results = db.exec(statement).scalars().all()
    return results