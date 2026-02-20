from app.database import get_session
from app.auth import get_valid_access_token
from app.models import TrackHistory, User, Track, Artist, Album
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Cookie, Depends, HTTPException
import httpx
from sqlalchemy import desc, select
from sqlmodel import Session

router = APIRouter()

@router.get("/")
async def get_history(
    offset: int = 0, 
    limit: int = 50, 
    session_id: Optional[str] = Cookie(None), 
    db: Session = Depends(get_session)
): 
    # 1. Authentification
    if not session_id:
        raise HTTPException(status_code=401, detail="Non connecté")

    user = db.exec(select(User).where(User.session_id == session_id)).scalar()
    if not user: 
        raise HTTPException(status_code=401, detail="Utilisateur introuvable")

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
                a_data = t_data["album"]
                # On prend le premier artiste de la liste pour simplifier la relation 1-n
                artist_data = t_data["artists"][0] 
                
                played_at = datetime.fromisoformat(item["played_at"].replace("Z", "+00:00"))

                # A. Gérer l'ARTISTE
                existing_artist = db.get(Artist, artist_data["id"])
                if not existing_artist:
                    new_artist = Artist(
                        spotify_id=artist_data["id"],
                        name=artist_data["name"],
                        image_url=None # Spotify ne donne pas l'image ici
                    )
                    db.add(new_artist)
                    db.flush()

                # B. Gérer l'ALBUM (qui possède la cover)
                existing_album = db.get(Album, a_data["id"])
                if not existing_album:
                    new_album = Album(
                        spotify_id=a_data["id"],
                        name=a_data["name"],
                        image_url=a_data["images"][0]["url"] if a_data["images"] else "",
                        artist_id=artist_data["id"]
                    )
                    db.add(new_album)
                    db.flush()

                # C. Gérer la TRACK
                existing_track = db.get(Track, t_data["id"])
                if not existing_track:
                    new_track = Track(
                        spotify_id=t_data["id"],
                        title=t_data["name"],
                        duration_ms=t_data["duration_ms"],
                        artist_id=artist_data["id"],
                        album_id=a_data["id"]
                    )
                    db.add(new_track)
                    db.flush()

                # D. Gérer l'HISTORIQUE (TrackHistory)
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

    # 3. Récupération avec jointures (History -> Track -> Album & Artist)
    # On récupère tout pour que le model_dump() contienne les infos nécessaires
    statement = (
        select(TrackHistory, Track, Album, Artist)
        .join(Track, TrackHistory.spotify_id == Track.spotify_id)
        .join(Album, Track.album_id == Album.spotify_id)
        .join(Artist, Track.artist_id == Artist.spotify_id)
        .where(TrackHistory.user_id == user.id)
        .order_by(desc(TrackHistory.played_at))
        .offset(offset)
        .limit(limit)
    )
    
    results = db.exec(statement).all()
    
    # 4. Formatage pour le frontend
    output = []
    for h, t, alb, art in results:
        data = {
            "history_id": h.id,
            "played_at": h.played_at,
            "spotify_id": t.spotify_id,
            "title": t.title,
            "duration_ms": t.duration_ms,
            "album_name": alb.name,
            "cover": alb.image_url,
            "artist_name": art.name,
            "artist_image": art.image_url
        }
        output.append(data)

    return output