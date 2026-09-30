from pydantic import BaseModel
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload
from sqlalchemy import func
from typing import List
from app.database import get_session
from app.models import Album, Track, TrackHistory

class TrackHistoryInfo(BaseModel):
    id: int
    ms_played: int

class TrackInfo(BaseModel):
    id: int
    duration_ms: int
    title: str
    history: List[TrackHistoryInfo]

    class Config:
        from_attributes = True

router = APIRouter(prefix="/errors")

@router.get("", response_model=List[TrackInfo])
def get_tracks_with_errors(
    db: Session = Depends(get_session),
    limit: int = 250,
    offset: int = 0
):
    # 1. Requête pour récupérer les tracks avec erreurs
    query = (
        db.query(Track)
        .options(
            joinedload(Track.album).joinedload(Album.artist),
            joinedload(Track.history) 
        )
        .join(TrackHistory)
        .filter(
            TrackHistory.ms_played > Track.duration_ms,
            Track.duration_ms != None
        )
        .group_by(Track.id)
        .order_by(func.min(TrackHistory.ms_played - Track.duration_ms).asc())
    )

    results = query.offset(offset).limit(limit).all()

    final_tracks = []
    need_commit = False

    for track in results:
        # LOGIQUE : Si la durée n'est pas un multiple de 100 (ex: 192812)
        if track.duration_ms % 100 != 0:
            # On normalise TOUS les historiques de cette track
            for h in track.history:
                # On affecte le min(duration, ms_played)
                # Si ms_played était > duration, il devient égal à duration
                h.ms_played = min(track.duration_ms, h.ms_played)
            
            need_commit = True
            
            # Après cette opération, par définition, ms_played ne peut plus être > duration
            # On passe donc à la track suivante, elle ne doit plus apparaître dans l'admin
            continue 

        # Si c'est un multiple de 100, on garde la logique d'affichage classique
        remaining_errors = [h for h in track.history if h.ms_played > track.duration_ms]
        
        if remaining_errors:
            final_tracks.append({
                "id": track.id,
                "title": track.title,
                "duration_ms": track.duration_ms,
                "artist_name": track.album.artist.name if track.album and track.album.artist else "Inconnu",
                "album_name": track.album.name if track.album else "Inconnu",
                "history": remaining_errors
            })

    # Validation des changements en base
    if need_commit:
        db.commit()

    return final_tracks

@router.post("")
def update_track_errors(data: TrackInfo, db: Session = Depends(get_session)):
    try:
        # 1. Update de la durée du morceau
        track = db.query(Track).filter(Track.id == data.id).first()
        if not track: raise HTTPException(status_code=404, detail="Track not found")
        
        track.duration_ms = data.duration_ms

        # 2. Update de chaque historique envoyé
        for h_data in data.history:
            history_item = db.query(TrackHistory).filter(
                TrackHistory.id == h_data.id,
                TrackHistory.track_id == data.id
            ).first()
            
            if history_item: history_item.ms_played = h_data.ms_played

        db.commit()
        return {"message": "Update successful"}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))