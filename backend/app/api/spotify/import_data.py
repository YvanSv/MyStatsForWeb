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

    for file in files:
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

            # Filtrage de base (ignore les podcasts ou écoutes trop courtes)
            if not track_name or not track_uri or ms_played == 0:
                stats["skipped"] += 1
                continue

            # Extraction de l'ID Spotify
            spotify_id = track_uri.split(":")[-1]
            if not spotify_id or len(spotify_id) < 15:
                continue

            try:
                # --- ANTI-DOUBLON HISTORIQUE ---
                existing_h = db.exec(select(TrackHistory).where(
                    TrackHistory.user_id == user.id,
                    TrackHistory.played_at == played_at,
                    TrackHistory.spotify_id == spotify_id
                )).first()
                if existing_h: continue

                # --- CRÉATION / RÉCUPÉRATION HIÉRARCHIQUE ---
                # 1. Artiste (Recherche par ID stable ou Nom ILIKE)
                artist_id_stable = stable_hash(artist_name)
                artist = db.exec(select(Artist).where(
                    or_(Artist.spotify_id == artist_id_stable, Artist.name.ilike(artist_name.strip()))
                )).first()
                
                if not artist:
                    artist = Artist(name=artist_name, spotify_id=artist_id_stable)
                    db.add(artist)
                    db.flush()

                # 2. Album (Hash combiné pour éviter les collisions entre artistes différents)
                album_id_stable = stable_hash(f"{album_name}_{artist.name}")
                album = db.exec(select(Album).where(Album.spotify_id == album_id_stable)).first()
                if not album:
                    album = Album(name=album_name, artist_id=artist.spotify_id, spotify_id=album_id_stable)
                    db.add(album)
                    db.flush()

                # 3. Track
                track = db.exec(select(Track).where(Track.spotify_id == spotify_id)).first()
                if not track:
                    track = Track(
                        spotify_id=spotify_id,
                        title=track_name,
                        artist_id=artist.spotify_id,
                        album_id=album.spotify_id,
                        duration_ms=0 # Sera complété par la Background Task
                    )
                    db.add(track)
                    new_tracks_to_enrich.append(spotify_id)
                    db.flush()

                # 4. Historique
                db.add(TrackHistory(
                    user_id=user.id,
                    spotify_id=spotify_id,
                    played_at=played_at,
                    ms_played=ms_played
                ))
                stats["added"] += 1

            except Exception as e:
                db.rollback()
                print(f"Erreur lors du traitement d'une ligne : {e}")
                continue

        # Commit par fichier pour garantir la persistance et libérer la mémoire
        db.commit()

    return {"status": "success", "message": f"Importation réussie : {stats['added']} écoutes ajoutées ({len(new_tracks_to_enrich)} à enrichir). {stats["skipped"]} skippées."}