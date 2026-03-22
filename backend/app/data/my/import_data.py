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
    set_progress(user_id, 2)
    await asyncio.sleep(0.1)
    # Chargement de l'historique existant
    results = db.exec(select(TrackHistory).where(TrackHistory.user_id == user_id)).all()
    existing_history = {(h.played_at, h.spotify_id): h for h in results}
    existing_tracks = set(db.exec(select(Track.spotify_id)).all())
    set_progress(user_id, 10)
    await asyncio.sleep(0.1)

    # Pré-lecture pour compter le nombre total d'entrées (pour la progression)
    all_files_data = []
    total_entries = 0
    for file in files:
        try:
            content = await file.read()
            data = json.loads(content)
            all_files_data.append(data)
            total_entries += len(data)
        except: continue
    
    print(f"ℹ️ {total_entries} entrées dans les fichiers")

    if total_entries == 0:
        set_progress(user_id, 100)
        await asyncio.sleep(0.25)
        return {"status": "success", "message": "Fichiers vides."}

    tracks_to_insert = {}
    history_mappings = []
    new_track_ids = set()
    current_import_seen = set()

    # 2. Traitement des fichiers
    processed_count = 0
    for raw_data in all_files_data:
        for entry in raw_data:
            processed_count += 1
            if processed_count % 2500 == 0:
                set_progress(user_id, 10 + int((processed_count / total_entries) * 50))
                await asyncio.sleep(0.1)

            uri = entry.get("spotify_track_uri")
            ts = entry.get("ts")
            ms = entry.get("ms_played", 0)
            if not uri or not ts: continue

            try: dt_obj = datetime.datetime.fromisoformat(ts.replace("Z", "+00:00")).replace(tzinfo=None)
            except: continue

            sid = uri.split(":")[-1]
            key = (dt_obj, sid)
            if key in current_import_seen:
                continue
            existing_entry = existing_history.get(key)

            if ms < 3000:
                if existing_entry:
                    # Si elle existait (ex: via l'API), on la supprime car elle ne respecte plus les critères
                    db.delete(existing_entry)
                    existing_history.pop(key)
                continue
            
            if existing_entry:
                # Mise à jour si la durée était à 0 (provenance API)
                if existing_entry.ms_played != ms:
                    existing_entry.ms_played = ms
                continue

            # Nouvelle écoute
            current_import_seen.add(key)

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

    set_progress(user_id, 65)
    await asyncio.sleep(0.3)

    if not history_mappings:
        set_progress(user_id, 100)
        await asyncio.sleep(0.25)
        return {"status": "success", "message": "Rien à ajouter."}

    # Insertion des nouvelles pistes d'abord (pour respecter les clés étrangères)
    if tracks_to_insert: db.execute(insert(Track), list(tracks_to_insert.values()))
    set_progress(user_id, 80)
    await asyncio.sleep(0.3)
    
    # Insertion de l'historique par paquets (batchs) de 5000 pour la stabilité
    if history_mappings:
        for i in range(0, len(history_mappings), 5000):
            db.execute(insert(TrackHistory), history_mappings[i:i+5000])
    set_progress(user_id, 90)
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