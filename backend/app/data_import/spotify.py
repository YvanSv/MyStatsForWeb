import asyncio
import datetime
import json
from typing import List
from fastapi import APIRouter, Depends, UploadFile, File
from sqlmodel import Session, select
from app.database import get_session
from app.models import MusicProvider, Track, TrackHistory, TrackMapping
from .workers.spotify.SpotifyWorker import spotify_worker
from app.response_message import UploadSuccessResponse
from app.auth.utils.auth_utils import get_current_user_id
from app.utils.progress_manager import set_progress

router = APIRouter()

@router.post("", response_model=UploadSuccessResponse)
async def upload_spotify_json(files: List[UploadFile] = File(...),user_id: int = Depends(get_current_user_id),db: Session = Depends(get_session)):
    set_progress(user_id, 5)
    await asyncio.sleep(0.1)
    
    # Chargement du cache pour éviter les doublons et les recherches inutiles
    # On indexe l'historique par (played_at, track_mapping_id)
    # Note: On récupère les mappings Spotify existants pour faire le lien
    existing_history = set(db.exec(select(TrackHistory.played_at).where(TrackHistory.user_id == user_id)).all())
    spotify_mappings = {m[0]: m[1] for m in db.exec(select(TrackMapping.provider_id, TrackMapping.track_id).where(TrackMapping.provider == MusicProvider.SPOTIFY)).all()}

    # Lecture des fichiers
    all_files_data = []
    total_entries = 0
    for file in files:
        content = await file.read()
        data = json.loads(content)
        all_files_data.append(data)
        total_entries += len(data)

    processed_count = 0
    history_to_insert = []

    set_progress(user_id, 10)
    await asyncio.sleep(0.1)
    
    for raw_data in all_files_data:
        for entry in raw_data:
            # Extraction des données de base
            uri = entry.get("spotify_track_uri")
            ts = entry.get("ts")
            ms = entry.get("ms_played", 0)
            if not uri or not ts or ms < 30000: continue

            track_spotify_id = uri.split(":")[-1]
            dt_obj = datetime.datetime.fromisoformat(ts.replace("Z", "+00:00")).replace(tzinfo=None)

            if dt_obj in existing_history: continue

            processed_count += 1
            if processed_count % 2500 == 0:
                set_progress(user_id, 10 + int((processed_count / total_entries) * 70))
                await asyncio.sleep(0.1)

            # Si le track id existe déjà la base de données, on ajoute simplement une écoute à l'historique en récupérant les infos des albums et artistes
            track_id = spotify_mappings.get(track_spotify_id)
            if track_id:
                t_obj = db.get(Track, track_id)
                artist_id = t_obj.artist_id
                album_id = t_obj.album_id
            else:
                artist_id = None
                album_id = None
                track_id = spotify_mappings.get(track_spotify_id)
                if not track_id:
                    new_track = Track(title=entry.get("master_metadata_track_name") or "", artist_id=artist_id, album_id=album_id)
                    db.add(new_track)
                    db.flush()
                    track_id = new_track.id
                    spotify_mappings[track_spotify_id] = track_id
                    db.add(TrackMapping(provider=MusicProvider.SPOTIFY, provider_id=track_spotify_id, track_id=track_id))

            # Préparation History
            history_to_insert.append(TrackHistory(
                user_id=user_id,
                track_id=track_id,
                artist_id=artist_id,
                album_id=album_id,
                played_at=dt_obj,
                ms_played=ms,
                provider=MusicProvider.SPOTIFY
            ))
            existing_history.add(dt_obj)

            # Commit intermédiaire pour vider la mémoire si trop gros
            if len(history_to_insert) >= 5000:
                db.add_all(history_to_insert)
                db.commit()
                history_to_insert = []

    # Finalisation
    if history_to_insert:
        db.add_all(history_to_insert)
        db.commit()

    # Déclenchement du worker pour enrichir (albums et artistes)
    # Le worker devra maintenant chercher les Tracks qui n'ont pas de mapping ISRC
    await spotify_worker.repair_metadata()

    set_progress(user_id, 100)
    return {"status": "success", "added": processed_count}