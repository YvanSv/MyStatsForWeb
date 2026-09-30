import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.auth.utils.auth_utils import get_current_user_id
from app.database import get_session
from app.models import MusicProvider, Track, TrackHistory, TrackMapping, User, UserAccount
from app.data_import.workers.spotify.SpotifyWorker import spotify_worker
from app.data_import.workers.spotify.utils.spotify_api import get_spotify_users_client
from app.data_import.workers.spotify.utils.spotify_token import get_valid_access_token
from app.data_import.workers.spotify.utils.api_call import run_spotify_task

router = APIRouter()

@router.get('')
async def refresh(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_session)):
    user = db.get(User, user_id)
    if not user: raise HTTPException(status_code=401, detail="Utilisateur introuvable")

    spotify_account = db.exec(select(UserAccount).where(
        UserAccount.user_id == user.id,
        UserAccount.provider == MusicProvider.SPOTIFY
    )).first()
    if not spotify_account:
        raise HTTPException(
            status_code=400,
            detail="Compte Spotify non lié. Impossible de rafraîchir l'historique."
        )

    await refresh_history(user, db)
    return {"status": "success", "message": "Synchronisation terminée."}


async def refresh_history(user: User, session: Session):
    """
    Récupère l'historique récent Spotify et remonte dans le temps jusqu'à trouver une écoute déjà enregistrée.
    """
    sp = get_spotify_users_client(await get_valid_access_token(user, session))

    # CHARGEMENT DU CACHE
    cache_history = set(session.exec(select(TrackHistory.played_at, TrackHistory.track_id).where(TrackHistory.user_id == user.id)).all())
    spotify_mappings = {m[0]: m[1] for m in session.exec(select(TrackMapping.provider_id, TrackMapping.track_id).where(TrackMapping.provider == MusicProvider.SPOTIFY)).all()}

    before = None
    added = 0
    while True:
        data = await run_spotify_task(sp.current_user_recently_played, limit=50, before=before)
        items = data['items'] if data else []
        if not items: break

        found_known = False
        for item in items:
            track = item['track']
            sid = track.get("id") if track else None
            played_at = item.get('played_at')
            if not sid or not played_at: continue
            try: dt_obj = datetime.datetime.fromisoformat(played_at.replace("Z", "+00:00")).replace(tzinfo=None)
            except ValueError: continue

            # Création de la track + mappings (artiste / album) si elle est inconnue
            track_id = spotify_mappings.get(sid)
            if not track_id:
                new_track = Track(title=track.get("name") or "")
                session.add(new_track)
                session.flush()
                track_id = new_track.id
                spotify_mappings[sid] = track_id
                session.add(TrackMapping(provider=MusicProvider.SPOTIFY, provider_id=sid, track_id=track_id))
                session.flush()
                spotify_worker._update_track_metadata(session, track)

            # Vérifier si cette écoute existe déjà en base
            if (dt_obj, track_id) in cache_history:
                found_known = True
                continue

            t_obj = session.get(Track, track_id)
            session.add(TrackHistory(
                user_id=user.id,
                track_id=track_id,
                artist_id=t_obj.artist_id,
                album_id=t_obj.album_id,
                played_at=dt_obj,
                ms_played=track.get('duration_ms') or 0,
                provider=MusicProvider.SPOTIFY
            ))
            cache_history.add((dt_obj, track_id))
            added += 1

        session.commit()

        # On s'arrête dès qu'on retombe sur une écoute connue ou qu'il n'y a plus de page précédente
        cursors = data.get("cursors")
        if found_known or not cursors or not cursors.get("before"): break
        before = cursors["before"]

    if added: print(f"Ajout de {added} nouvelles écoutes pour {user.display_name}")

    # Enrichissement (images d'artistes, etc.)
    await spotify_worker.repair_metadata()
    return True
