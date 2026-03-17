import asyncio
import datetime
import json
import hashlib
from typing import List
from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy import insert
from sqlmodel import Session, select
from app.database import get_session
from app.models import Track, TrackHistory
from app.spotify.utils.SpotifyWorker import spotify_worker
from app.response_message import UploadSuccessResponse
from app.auth.utils.auth_utils import get_current_user_id
from app.utils.progress_manager import set_progress

router = APIRouter()

def stable_hash(text: str) -> str:
    """Génère un ID stable et unique basé sur le contenu pour éviter les doublons."""
    normalized = text.strip().lower()
    return f"gen_{hashlib.md5(normalized.encode()).hexdigest()[:16]}"

@router.post("", response_model=UploadSuccessResponse)
async def upload_spotify_json(files: List[UploadFile] = File(...),user_id: int = Depends(get_current_user_id),db: Session = Depends(get_session)):
    """
    Traite et importe les fichiers d'historique d'écoute Spotify.

    **Fonctionnement du pipeline :**
    1. **Dédoublonnage intelligent** : Compare chaque entrée avec l'historique existant (`played_at` + `spotify_id`) pour éviter les doublons.
    2. **Filtrage de qualité** : Ignore les écoutes de moins de 3 secondes (souvent des zappings).
    3. **Insertion optimisée** : Utilise `add_all` et `flush` pour gérer les relations entre les nouvelles pistes et l'historique.
    4. **Enrichissement asynchrone** : Les pistes inconnues sont créées avec un titre temporaire, puis envoyées à un **Worker** qui récupère les images et détails via l'API Spotify.

    **Note :** Cette route peut prendre du temps selon la taille des fichiers. Le traitement des images se fait en arrière-plan pour ne pas bloquer l'utilisateur.
    """
    set_progress(user_id, 0)
    await asyncio.sleep(0.1)
    # 1. Chargement de l'historique existant (Set de tuples pour recherche O(1))
    existing_history = set(
        db.exec(select(TrackHistory.played_at, TrackHistory.spotify_id).where(TrackHistory.user_id == user_id)).all()
    )
    existing_tracks = set(db.exec(select(Track.spotify_id)).all())
    set_progress(user_id, 5)
    await asyncio.sleep(0.2)

    tracks_to_insert = {}
    history_mappings = []
    new_track_ids = set()

    # 2. Traitement des fichiers
    progress = 5
    for file in files:
        try: raw_data = json.loads(await file.read())
        except: continue

        for entry in raw_data:
            uri = entry.get("spotify_track_uri")
            ts = entry.get("ts")
            ms = entry.get("ms_played", 0)
            if not uri or not ts or ms < 3000: continue
            sid = uri.split(":")[-1]
            
            # Conversion date rapide (ISO format est standard, replace('Z') suffit souvent)
            try: dt_obj = datetime.datetime.fromisoformat(ts.replace("Z", "+00:00")).replace(tzinfo=None)
            except: continue

            # Dédoublonnage
            if (dt_obj, sid) in existing_history: continue

            # Préparation de la Track si inconnue
            if sid not in existing_tracks and sid not in tracks_to_insert:
                tracks_to_insert[sid] = {
                    "spotify_id": sid,
                    "title": entry.get("master_metadata_track_name") or "Chargement..."
                }
                new_track_ids.add(sid)

            # Préparation de l'historique
            history_mappings.append({
                "user_id": user_id,
                "spotify_id": sid,
                "played_at": dt_obj,
                "ms_played": ms
            })
        progress += 30 // len(files)
        set_progress(user_id, progress)
        await asyncio.sleep(0.3)

    if not history_mappings:
        set_progress(user_id, 100)
        await asyncio.sleep(0.3)
        return {"status": "success", "message": "Rien à ajouter."}

    set_progress(user_id, 35)
    await asyncio.sleep(0.3)
    # Insertion des nouvelles pistes d'abord (pour respecter les clés étrangères)
    if tracks_to_insert: db.execute(insert(Track), list(tracks_to_insert.values()))
    set_progress(user_id, 55)
    await asyncio.sleep(0.3)
    
    # Insertion de l'historique par paquets (batchs) de 5000 pour la stabilité
    if history_mappings:
        for i in range(0, len(history_mappings), 5000):
            db.execute(insert(TrackHistory), history_mappings[i:i+5000])
    set_progress(user_id, 75)
    await asyncio.sleep(0.3)
    
    db.commit()

    if new_track_ids: await spotify_worker.add_tracks(list(new_track_ids))
    await spotify_worker.should_repair_history()

    set_progress(user_id, 100)
    await asyncio.sleep(0.3)
    return {
        "status": "success", 
        "added": len(history_mappings), 
        "info": f"{len(history_mappings)} écoutes ajoutées."
    }