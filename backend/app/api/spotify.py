from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Cookie, Depends, HTTPException
import httpx
from sqlalchemy import desc, select, func
from sqlmodel import Session

from app.auth import get_valid_access_token
from app.database import get_session
from app.models import TrackHistory, User, Track

router = APIRouter(prefix="/spotify", tags=["spotify"])

@router.get("/recently-played")
async def get_recently_played(
    offset: int = 0, 
    limit: int = 50, 
    session_id: Optional[str] = Cookie(None), 
    db: Session = Depends(get_session)
): 
    # 1. Authentification
    if not session_id:
        raise HTTPException(status_code=401, detail="Non connecté")

    user = db.exec(select(User).where(User.session_id == session_id)).scalar()
    if not user: raise HTTPException(status_code=401, detail="Utilisateur introuvable")

    # 2. Synchronisation Spotify
    if offset == 0:
        access_token = await get_valid_access_token(user, db)
        async with httpx.AsyncClient() as client:
            spotify_res = await client.get(
                "https://api.spotify.com/v1/me/player/recently-played?limit=50",
                headers={"Authorization": f"Bearer {access_token}"}
            )
        
        if spotify_res.status_code == 200:
            spotify_data = spotify_res.json()
            
            for item in spotify_data.get("items", []):
                t_data = item["track"]
                played_at = datetime.fromisoformat(item["played_at"].replace("Z", "+00:00"))

                # A. Gérer la table Track (Metadata)
                existing_track = db.get(Track, t_data["id"])
                if not existing_track:
                    new_track = Track(
                        spotify_id=t_data["id"],
                        title=t_data["name"],
                        artist_name=", ".join([a["name"] for a in t_data["artists"]]),
                        album_name=t_data["album"]["name"],
                        duration_ms=t_data["duration_ms"],
                        image_url=t_data["album"]["images"][0]["url"] if t_data["album"]["images"] else ""
                    )
                    db.add(new_track)
                    db.flush() 

                # B. Gérer la table TrackHistory (L'écoute)
                exists = db.exec(
                    select(TrackHistory).where(
                        TrackHistory.user_id == user.id,
                        TrackHistory.played_at == played_at
                    )
                ).first()

                if not exists:
                    db.add(TrackHistory(
                        spotify_id=t_data["id"],
                        user_id=user.id,
                        played_at=played_at
                    ))
            
            db.commit()

    # Jointure pour l'historique
    statement = (
        select(TrackHistory, Track)
        .join(Track, TrackHistory.spotify_id == Track.spotify_id)
        .where(TrackHistory.user_id == user.id)
        .order_by(desc(TrackHistory.played_at))
        .offset(offset)
        .limit(limit)
    )
    
    results = db.exec(statement).all()
    
    return [
        {
            "history_id": h.id,
            "played_at": h.played_at,
            **t.model_dump() 
        } for h, t in results
    ]

@router.get("/musics")
async def get_user_musics(
    offset: int = 0, 
    limit: int = 50, 
    session_id: Optional[str] = Cookie(None), 
    db: Session = Depends(get_session)
):
    if not session_id:
        raise HTTPException(status_code=401, detail="Non connecté")

    user = db.exec(select(User).where(User.session_id == session_id)).scalar()
    if not user: raise HTTPException(status_code=401, detail="Utilisateur introuvable")

    # Agrégation avec les noms de colonnes du modèle Track
    statement = (
        select(
            Track.spotify_id,
            Track.title,
            Track.artist_name,
            Track.album_name,
            Track.image_url,
            Track.duration_ms,
            func.count(TrackHistory.id).label("play_count")
        )
        .join(TrackHistory, Track.spotify_id == TrackHistory.spotify_id)
        .where(TrackHistory.user_id == user.id)
        .group_by(
            Track.spotify_id, 
            Track.title, 
            Track.artist_name, 
            Track.album_name, 
            Track.image_url, 
            Track.duration_ms
        )
        .order_by(desc("play_count"))
        .offset(offset)
        .limit(limit)
    )
    
    results = db.exec(statement).all()
    
    output = []
    for r in results:
        play_count = r[6]
        duration_ms = r[5]
        total_minutes = (play_count * duration_ms) / 60000
        part1 = (1.0 * total_minutes / play_count)
        part2 = (total_minutes / 10.0) / 10.0
        rating = round((part1 + part2) / 2, 2)

        output.append({
            "spotify_id": r[0],
            "title": r[1],
            "artist": r[2],
            "album": r[3],
            "cover": r[4],
            "duration_ms": duration_ms,
            "play_count": play_count,
            "total_minutes": round(total_minutes, 1),
            "rating": rating
        })
    
    return output