import datetime
import json
import hashlib
from math import ceil
import random
import time
from typing import List, Optional
from fastapi import APIRouter, Cookie, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlmodel import Session, select
from app.database import get_session
from app.models import User, Track, TrackHistory, Artist, Album
from app.utils.spotify_api import get_spotify_client

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

    sp = get_spotify_client()
    valid_entries = []
    needed_track_ids = set()

    # Charger l'historique existant immédiatement
    all_history = set(
        db.exec(
            select(TrackHistory.played_at, TrackHistory.spotify_id)
            .where(TrackHistory.user_id == user.id)
        ).all()
    )

    print(f"👂 {len(all_history)} écoutes dans l'historique")

    # 1. PRE-SCAN & FILTRAGE IMMEDIAT
    for file in files:
        content = await file.read()
        try: data = json.loads(content)
        except: continue
        for entry in data:
            uri = entry.get("spotify_track_uri")
            played_at = entry.get("ts")
            ms_played = entry.get("ms_played") or 0
            if uri and ":" in uri and played_at:
                sid = uri.split(":")[-1]
                # On filtre : si c'est déjà en base, on ignore complètement l'entrée
                try: dt_obj = datetime.datetime.fromisoformat(played_at.replace("Z", "+00:00")).replace(tzinfo=None)
                except ValueError: continue
                if (dt_obj, sid) in all_history: continue
                # On ignore aussi les écoutes trop courtes (moins de 10s)
                if ms_played < 10000: continue
                valid_entries.append(entry)
                needed_track_ids.add(sid)
    print(f"🆕 {len(valid_entries)} nouvelles écoutes à ajouter.")
    if not valid_entries: return {"status": "success", "message": "Aucune nouvelle écoute à ajouter."}

    # 2. ENRICHISSEMENT API : On récupère les vrais IDs d'artistes/albums
    # On crée un dictionnaire de mapping : { track_id: {real_album_id, real_artist_id, etc.} }
    track_metadata_map = {}
    id_list = list(needed_track_ids)
    
    print(f"📦 Enrichissement de {len(id_list)} tracks via l'API...")
    for i in range(0, len(id_list), 50):
        batch = id_list[i:i+50]
        sp_results = sp.tracks(batch)['tracks']
        for t in sp_results:
            if not t: continue
            track_metadata_map[t['id']] = {
                "album_id": t['album']['id'],
                "album_name": t['album']['name'],
                "album_img": t['album']['images'][0]['url'] if t['album']['images'] else None,
                "artist_id": t['artists'][0]['id'],
                "artist_name": t['artists'][0]['name'],
                "duration_ms": t['duration_ms']
            }
        print(f"✅ Batch numéro {round(i/50+1)}/{ceil(len(id_list)/50)} terminé")
        time.sleep(random.uniform(1.5, 3.0))

    # 3. CACHE DB (Pour éviter les doublons lors de l'insertion)
    # On charge ce qu'on a déjà pour ne pas réinsérer
    existing_artists = {sid for sid in db.exec(select(Artist.spotify_id)).all()}
    existing_albums = {sid for sid in db.exec(select(Album.spotify_id)).all()}
    existing_tracks = {sid for sid in db.exec(select(Track.spotify_id)).all()}

    to_add_artists = {}
    to_add_albums = {}
    to_add_tracks = {}
    to_add_history = []

    # 4. TRAITEMENT FINAL
    for entry in valid_entries:
        sid = entry["spotify_track_uri"].split(":")[-1]
        meta = track_metadata_map.get(sid)
        if not meta: continue # Track non trouvée sur Spotify

        # Gestion Artiste (VRAI ID)
        if meta["artist_id"] not in existing_artists and meta["artist_id"] not in to_add_artists:
            to_add_artists[meta["artist_id"]] = Artist(spotify_id=meta["artist_id"], name=meta["artist_name"])

        # Gestion Album (VRAI ID)
        if meta["album_id"] not in existing_albums and meta["album_id"] not in to_add_albums:
            to_add_albums[meta["album_id"]] = Album(
                spotify_id=meta["album_id"], 
                name=meta["album_name"], 
                artist_id=meta["artist_id"],
                image_url=meta["album_img"]
            )

        # Gestion Track (VRAI ID)
        if sid not in existing_tracks and sid not in to_add_tracks:
            to_add_tracks[sid] = Track(
                spotify_id=sid,
                title=entry.get("master_metadata_track_name"),
                artist_id=meta["artist_id"],
                album_id=meta["album_id"],
                duration_ms=meta["duration_ms"]
            )

        # Historique
        to_add_history.append(TrackHistory(
            user_id=user.id,
            spotify_id=sid,
            played_at=entry.get("ts"),
            ms_played=entry.get("ms_played") or 0
        ))

    # 5. COMMIT
    db.add_all(to_add_artists.values())
    db.add_all(to_add_albums.values())
    db.add_all(to_add_tracks.values())
    db.flush()
    db.add_all(to_add_history)
    db.commit()

    return {"status": "success", "added": len(to_add_history)}