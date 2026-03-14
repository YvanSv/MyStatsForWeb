import datetime
import json
import hashlib
from typing import List, Optional
from fastapi import APIRouter, Cookie, Depends, HTTPException, UploadFile, File
from sqlalchemy import insert
from sqlmodel import Session, select
from app.database import get_session
from app.models import User, Track, TrackHistory
from app.spotify.utils.SpotifyWorker import spotify_worker
from app.response_message import UploadSuccessResponse

router = APIRouter()

def stable_hash(text: str) -> str:
    """Génère un ID stable et unique basé sur le contenu pour éviter les doublons."""
    normalized = text.strip().lower()
    return f"gen_{hashlib.md5(normalized.encode()).hexdigest()[:16]}"

@router.post(
    "",
    summary="Importer l'historique JSON de Spotify",
    response_model=UploadSuccessResponse,
    responses={
        200: {"model": UploadSuccessResponse, "description": "Importation réussie, traitement asynchrone lancé."},
        401: {"description": "Utilisateur non connecté (cookie session_id manquant)."},
    }
)
async def upload_spotify_json(
    files: List[UploadFile] = File(...),
    session_id: Optional[str] = Cookie(None),
    db: Session = Depends(get_session)
):
    """
    Traite et importe les fichiers d'historique d'écoute Spotify.

    **Fonctionnement du pipeline :**
    1. **Dédoublonnage intelligent** : Compare chaque entrée avec l'historique existant (`played_at` + `spotify_id`) pour éviter les doublons.
    2. **Filtrage de qualité** : Ignore les écoutes de moins de 3 secondes (souvent des zappings).
    3. **Insertion optimisée** : Utilise `add_all` et `flush` pour gérer les relations entre les nouvelles pistes et l'historique.
    4. **Enrichissement asynchrone** : Les pistes inconnues sont créées avec un titre temporaire, puis envoyées à un **Worker** qui récupère les images et détails via l'API Spotify.

    **Note :** Cette route peut prendre du temps selon la taille des fichiers. Le traitement des images se fait en arrière-plan pour ne pas bloquer l'utilisateur.
    """
    # Authentification de l'utilisateur
    user = db.exec(select(User).where(User.session_id == session_id)).first()
    if not user: raise HTTPException(status_code=401, detail="Non connecté")

    valid_entries = []
    new_track_ids_for_worker = set()
    # Charger l'historique existant immédiatement
    all_history = set(
        db.exec(
            select(TrackHistory.played_at, TrackHistory.spotify_id)
            .where(TrackHistory.user_id == user.id)
        ).all()
    )

    print(f"👂 {len(all_history)} écoutes dans l'historique")

    # 2. PRE-SCAN & FILTRAGE IMMEDIAT
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
                # On ignore aussi les écoutes trop courtes (moins de 3s)
                try: dt_obj = datetime.datetime.fromisoformat(played_at.replace("Z", "+00:00")).replace(tzinfo=None)
                except ValueError: continue
                if (dt_obj, sid) in all_history or ms_played < 3000: continue
                valid_entries.append(entry)

    print(f"🆕 {len(valid_entries)} nouvelles écoutes à ajouter.")
    if not valid_entries: return {"status": "success", "message": "Aucune nouvelle écoute à ajouter."}

    # 3. CACHE DB (Pour éviter les doublons lors de l'insertion)
    # On charge ce qu'on a déjà pour ne pas réinsérer
    existing_tracks = {sid for sid in db.exec(select(Track.spotify_id)).all()}
    to_add_tracks = {}
    to_add_history = []

    for entry in valid_entries:
        sid = entry["spotify_track_uri"].split(":")[-1]

        # Si la track n'existe pas du tout, on la crée avec le strict minimum
        # Le worker viendra remplir album_id, artist_id et duration plus tard
        if sid not in existing_tracks and sid not in to_add_tracks:
            to_add_tracks[sid] = Track(
                spotify_id=sid,
                title=entry.get("master_metadata_track_name") or "Chargement..."
            )
            new_track_ids_for_worker.add(sid)

        to_add_history.append(TrackHistory(
            user_id=user.id,
            spotify_id=sid,
            played_at=entry.get("ts"),
            ms_played=entry.get("ms_played") or 0
        ))

    # 4. COMMIT IMMEDIAT
    if to_add_tracks:
        db.add_all(to_add_tracks.values())
        db.flush()
    if to_add_history:
        history_data = [{
            "user_id": h.user_id,
            "spotify_id": h.spotify_id,
            "played_at": h.played_at,
            "ms_played": h.ms_played
        } for h in to_add_history]
        db.exec(insert(TrackHistory).values(history_data))
    db.commit()

    # 5. APPEL AU WORKER (Asynchrone)
    # On envoie la liste des IDs qui ont besoin d'être enrichis
    await spotify_worker.add_tracks(list(new_track_ids_for_worker))
    return {
        "status": "success", 
        "added": len(to_add_history), 
        "info": "Vos écoutes ont été ajoutées. Les images et détails arrivent en arrière-plan."
    }