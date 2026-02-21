import datetime
import json
import hashlib
from typing import List, Optional
from fastapi import APIRouter, Cookie, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlmodel import Session, select, or_
from app.database import get_session
from app.models import User, Track, TrackHistory, Artist, Album

router = APIRouter()

def stable_hash(text: str) -> str:
    """Génère un ID stable et unique basé sur le contenu pour éviter les doublons."""
    normalized = text.strip().lower()
    return f"gen_{hashlib.md5(normalized.encode()).hexdigest()[:16]}"

@router.post("/upload-json")
async def upload_spotify_json(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    session_id: Optional[str] = Cookie(None),
    db: Session = Depends(get_session)
):
    # 1. Authentification de l'utilisateur
    user = db.exec(select(User).where(User.session_id == session_id)).first()
    if not user: raise HTTPException(status_code=401, detail="Non connecté")

    new_tracks_to_enrich = []
    stats = {"added": 0, "skipped": 0}

    # 2. CACHE : On charge les IDs existants pour éviter les SELECT dans la boucle
    # Artistes
    # On crée un dictionnaire { "nom_normalisé": "spotify_id" }
    all_artists = db.exec(select(Artist.name, Artist.spotify_id)).all()
    artist_cache = {name.strip().lower(): sid for name, sid in all_artists}
    # Albums
    all_albums_raw = db.exec(select(Album.name, Album.artist_id, Album.spotify_id)).all()
    album_cache = {(alb.strip().lower(), aid): sid for alb, aid, sid in all_albums_raw}
    # Tracks
    all_tracks_ids = set(db.exec(select(Track.spotify_id)).all())
    # TrackHistory
    all_history = set(db.exec(select(TrackHistory.played_at, TrackHistory.spotify_id)
        .where(TrackHistory.user_id == user.id)).all())

    to_add_artists = {}
    to_add_albums = {}
    to_add_tracks = {}
    to_add_history = []

    for file in files:
        print(f"Computing file {file.filename}")
        content = await file.read()
        try: data = json.loads(content)
        except json.JSONDecodeError: continue

        for entry in data:
            # Extraction des données du format "Account Data"
            track_name = entry.get("master_metadata_track_name")
            artist_name = entry.get("master_metadata_album_artist_name")
            album_name = entry.get("master_metadata_album_album_name")
            track_uri = entry.get("spotify_track_uri")
            ms_played = entry.get("ms_played") or 0
            played_at = entry.get("ts")
            if not track_uri or not isinstance(track_uri, str): continue
            spotify_id = track_uri.split(":")[-1]
            
            # Filtrage de base (ignore les podcasts ou écoutes trop courtes)
            if not track_name or not track_uri or ms_played < 10000:
                stats["skipped"] += 1
                continue

            # 1. Conversion de la string JSON en objet datetime Python
            # On remplace le 'Z' par '+00:00' pour que fromisoformat le comprenne comme UTC
            try:
                played_at_obj = datetime.datetime.fromisoformat(played_at.replace("Z", "+00:00"))
                played_at_obj = played_at_obj.replace(tzinfo=None) 
            except ValueError: continue

            # 2. Vérification Historique avec le type identique au cache
            if (played_at_obj, spotify_id) in all_history: continue

            # 2. Gestion Artiste
            art_norm = artist_name.strip().lower()
            if art_norm in artist_cache:
                art_id = artist_cache[art_norm]
            else:
                art_id = stable_hash(artist_name)
                if art_id not in to_add_artists:
                    to_add_artists[art_id] = Artist(name=artist_name, spotify_id=art_id)
                artist_cache[art_norm] = art_id

            # 3. Gestion Album (Nom + Artist_ID -> ID)
            alb_norm = album_name.strip().lower()
            cache_key = (alb_norm, art_id)

            if cache_key in album_cache:
                alb_id = album_cache[cache_key]
            else:
                alb_id = stable_hash(f"{album_name}_{art_id}")
                if alb_id not in to_add_albums:
                    to_add_albums[alb_id] = Album(name=album_name, artist_id=art_id, spotify_id=alb_id)
                album_cache[cache_key] = alb_id

            # 4. Gestion Track
            if spotify_id not in all_tracks_ids and spotify_id not in to_add_tracks:
                to_add_tracks[spotify_id] = Track(
                    spotify_id=spotify_id, 
                    title=track_name, 
                    artist_id=art_id, 
                    album_id=alb_id, 
                    duration_ms=0
                )
                # Pas besoin de mettre à jour all_tracks_ids ici car le spotify_id est unique dans le JSON

            # 5. Ajout à l'historique
            to_add_history.append(TrackHistory(
                user_id=user.id, 
                spotify_id=spotify_id, 
                played_at=played_at, 
                ms_played=ms_played
            ))
            all_history.add((played_at, spotify_id))
            stats["added"] += 1

    # 3. INSERTION MASSIVE (Bulk)
    # On ajoute tout d'un coup. SQLModel/SQLAlchemy gérera ça en très peu de requêtes.
    db.add_all(to_add_artists.values())
    db.add_all(to_add_albums.values())
    db.add_all(to_add_tracks.values())
    db.flush() # Pour lier les IDs avant l'historique
    
    db.add_all(to_add_history)
    db.commit()

    return {"status": "success", "message": f"Importation réussie : {stats['added']} écoutes ajoutées. {stats["skipped"]} skippées."}