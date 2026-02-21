from app.database import get_session
from app.models import TrackHistory, User, Track, Artist, Album
from typing import Optional
from fastapi import APIRouter, Cookie, Depends, HTTPException
from sqlalchemy import desc, asc, func, select
from sqlmodel import Session

router = APIRouter()

@router.get("/")
async def get_user_musics(
    offset: int = 0,
    limit: int = 50,
    sort_by: str = "play_count",
    direction: str = "desc",
    session_id: Optional[str] = Cookie(None),
    db: Session = Depends(get_session)
):
    if not session_id: raise HTTPException(status_code=401, detail="Non connecté")
    user_result = db.exec(select(User).where(User.session_id == session_id)).first()
    if not user_result: raise HTTPException(status_code=401, detail="Utilisateur introuvable")
    if isinstance(user_result, User): current_user_id = user_result.id
    else: current_user_id = user_result[0].id

    # 2. Construction de la requête
    statement = (
        select(
            Track,
            Artist.name.label("artist_name"),
            Album.name.label("album_name"),
            Album.image_url.label("cover_url"),
            func.count(TrackHistory.id).label("play_count"),
            func.sum(TrackHistory.ms_played).label("total_ms_real")
        )
        .join(TrackHistory, Track.spotify_id == TrackHistory.spotify_id)
        .join(Artist, Track.artist_id == Artist.spotify_id)
        .join(Album, Track.album_id == Album.spotify_id)
        .where(TrackHistory.user_id == current_user_id)
        .group_by(
            Track.spotify_id, 
            Artist.name, 
            Album.name, 
            Album.image_url
        )
    )

    # 3. Tri SQL
    if sort_by == "play_count": statement = statement.order_by(desc("play_count") if direction == "desc" else asc("play_count"))
    elif sort_by == "total_minutes": statement = statement.order_by(desc("total_ms_real") if direction == "desc" else asc("total_ms_real"))
    elif sort_by == "name": statement = statement.order_by(desc(Track.title) if direction == "desc" else asc(Track.title))
    else: statement = statement.order_by(desc("play_count"))
    results = db.exec(statement).all()

    all_musics = []
    for row in results:
        track_obj = row[0]
        artist_name = row[1]
        album_name = row[2]
        cover_url = row[3]
        play_count = row[4]
        total_ms_real = row[5] or 0
        
        total_minutes = total_ms_real / 60000
        
        # Engagement
        duration_theorique_ms = play_count * track_obj.duration_ms
        engagement = 0
        if duration_theorique_ms > 0:
            engagement = round(min(total_ms_real, duration_theorique_ms) / duration_theorique_ms * 100)

        # Rating
        if play_count > 0:
            part1 = (1.0 * total_minutes / play_count)
            part2 = (total_minutes / 10.0) / 10.0
            rating = round((part1 + part2) / 2, 2)
        else:
            rating = 0

        all_musics.append({
            "spotify_id": track_obj.spotify_id,
            "title": track_obj.title,
            "artist": artist_name,
            "album": album_name,
            "cover": cover_url,        
            "duration_ms": track_obj.duration_ms,
            "play_count": play_count,
            "total_minutes": round(total_minutes),
            "engagement": engagement,
            "rating": rating
        })

    # 4. Tri Python pour les colonnes calculées
    if sort_by in ["rating", "engagement"]:
        all_musics.sort(key=lambda x: x[sort_by], reverse=(direction == "desc"))

    return all_musics[offset : offset + limit]