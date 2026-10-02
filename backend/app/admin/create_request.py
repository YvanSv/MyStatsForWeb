from typing import List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from sqlalchemy import func, update
from sqlmodel import Session, select
from sqlalchemy.orm import joinedload
from app.database import get_session
from app.models import Album, AlbumMapping, Artist, ArtistMapping, CreateRequest, MusicProvider, Track, TrackHistory, TrackMapping

router = APIRouter(prefix="/create-requests")

@router.get("")
def get_create_requests(
    *,
    session: Session = Depends(get_session),
    offset: int = 0,
    limit: int = Query(default=100, lte=100)
):
    # Requête optimisée avec count en une seule fois
    requests = session.exec(
        select(CreateRequest)
        .join(Track, CreateRequest.track_id == Track.id)
        .outerjoin(TrackHistory, Track.id == TrackHistory.track_id)
        .group_by(CreateRequest.id)
        .order_by(func.count(TrackHistory.id).desc())
        .offset(offset)
        .limit(limit)
    ).all()
        
    output = []
    for req in requests:
        # On récupère le count spécifique
        history_count = session.exec(
            select(func.count(TrackHistory.id))
            .where(TrackHistory.track_id == req.track_id)
        ).one()

        output.append({
            **req.model_dump(),
            "history_count": history_count,
            "track": session.get(Track, req.track_id)
        })
    return output

@router.get("/{cr_id}")
def get_create_request_by_id(cr_id: int,session: Session = Depends(get_session)):
    """
    Récupère les détails d'une Create Request spécifique par son ID.
    """
    # 1. Récupère la requête
    cr = session.get(CreateRequest, cr_id)
    if not cr: 
        raise HTTPException(status_code=404, detail="Create Request non trouvée")
    
    # 2. Récupère la track
    track = session.get(Track, cr.track_id)
    
    # 3. SI la track existe, on va chercher ses "enfants" manuellement
    track_data = None
    if track:
        # Récupération des mappings
        mappings = session.exec(
            select(TrackMapping).where(TrackMapping.track_id == track.id)
        ).all()
        
        # Récupération de l'historique (trié par date)
        history = session.exec(
            select(TrackHistory)
            .where(TrackHistory.track_id == track.id)
            .order_by(TrackHistory.played_at.desc())
        ).all()

        # On transforme l'objet Track en dict et on injecte les listes
        track_data = track.model_dump()
        track_data["mappings"] = mappings
        track_data["history"] = history
        
        # Optionnel : Si tu as besoin de l'artiste de la track
        from app.models import Artist
        track_data["artist"] = session.get(Artist, track.artist_id)

    # 4. On renvoie le tout
    return {
        **cr.model_dump(), 
        "track": track_data
    }

@router.post("/{cr_id}/resolve")
def resolve_create_request(
    cr_id: int, 
    approve: bool = Body(..., embed=True),
    master_index: int = Body(0),
    session: Session = Depends(get_session)
):
    cr = session.get(CreateRequest, cr_id)
    if not cr: raise HTTPException(404)

    if approve:
        track = session.get(Track, cr.track_id)
        suggestions = cr.match_data.get("suggestions", [])
        
        if suggestions and master_index < len(suggestions):
            selected_data = suggestions[master_index]
            # Utilise la nouvelle logique Spotify
            apply_spotify_metadata(session, track, selected_data)
            print(f"✅ Track {track.id} validée via Spotify.")

    # Une fois résolu (approuvé ou non), on supprime la requête
    session.delete(cr)
    session.commit()
    return {"status": "success"}

def apply_spotify_metadata(db: Session, track: Track, sp_data: dict):
    """
    Applique les métadonnées Spotify (Format simplifié).
    """
    # 1. ARTISTE
    artist_name = sp_data.get("artist", "Unknown Artist")
    sp_artist_id = sp_data.get("artist_id")
    # Sécurité : On ne passe l'ID que s'il existe pour éviter la NotNullViolation
    active_artist = get_or_create_artist_spotify(db, artist_name, sp_artist_id)

    # 2. ALBUM
    active_album = None
    album_name = sp_data.get("album")
    sp_album_id = sp_data.get("album_id")
    if album_name:
        active_album = get_or_create_album_spotify(
            db, album_name, sp_album_id, active_artist.id, sp_data.get("image_url")
        )

    # 3. TRACK
    track.title = sp_data.get("title", track.title)
    if sp_data.get("duration_ms"):
        track.duration_ms = sp_data["duration_ms"]
    
    track.artist_id = active_artist.id
    track.album_id = active_album.id if active_album else None
    
    db.add(track)
    db.flush()

    # 4. MAPPINGS
    if sp_data.get("isrc"):
        add_track_mapping(db, track.id, MusicProvider.ISRC, sp_data["isrc"])
    if sp_data.get("id"):
        add_track_mapping(db, track.id, MusicProvider.SPOTIFY, sp_data["id"])

    # 5. HISTORIQUE
    db.exec(
        update(TrackHistory)
        .where(TrackHistory.track_id == track.id)
        .values(artist_id=active_artist.id, album_id=track.album_id)
    )

def get_or_create_artist_spotify(db: Session, name: str, sp_id: Optional[str]) -> Artist:
    artist = None
    # Priorité à l'ID Spotify
    if sp_id:
        mapping = db.exec(
            select(ArtistMapping).where(
                ArtistMapping.provider == MusicProvider.SPOTIFY,
                ArtistMapping.provider_id == sp_id
            )
        ).first()
        if mapping:
            artist = db.get(Artist, mapping.artist_id)

    # Fallback au nom
    if not artist:
        artist = db.exec(select(Artist).where(func.lower(Artist.name) == name.lower())).first()

    if not artist:
        artist = Artist(name=name)
        db.add(artist)
        db.flush()

    # Création du mapping si on a un ID et qu'il manque
    if sp_id:
        existing_m = db.exec(
            select(ArtistMapping).where(
                ArtistMapping.artist_id == artist.id, 
                ArtistMapping.provider_id == sp_id
            )
        ).first()
        if not existing_m:
            db.add(ArtistMapping(artist_id=artist.id, provider=MusicProvider.SPOTIFY, provider_id=sp_id))
    
    return artist

def get_or_create_album_spotify(db: Session, name: str, sp_id: str, artist_id: int, img_url: str) -> Album:
    album = None
    if sp_id:
        # Tentative via mapping (nécessite une table AlbumMapping)
        # Si tu n'as pas AlbumMapping, ignore ce bloc
        mapping = db.exec(select(AlbumMapping).where(AlbumMapping.provider_id == sp_id)).first()
        if mapping: album = db.get(Album, mapping.album_id)

    if not album:
        album = db.exec(select(Album).where(Album.name == name, Album.artist_id == artist_id)).first()

    if not album:
        album = Album(name=name, artist_id=artist_id, image_url=img_url)
        db.add(album)
        db.flush()
        if sp_id:
            db.add(AlbumMapping(album_id=album.id, provider=MusicProvider.SPOTIFY, provider_id=sp_id))
    
    return album

def add_track_mapping(db: Session, track_id: int, provider: MusicProvider, provider_id: str):
    if not provider_id: return
    existing = db.exec(
        select(TrackMapping).where(
            TrackMapping.track_id == track_id,
            TrackMapping.provider == provider,
            TrackMapping.provider_id == provider_id
        )
    ).first()
    if not existing:
        db.add(TrackMapping(track_id=track_id, provider=provider, provider_id=provider_id))