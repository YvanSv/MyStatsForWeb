import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlmodel import Session
from app.auth.utils.auth_utils import get_current_user_id
from app.database import get_session
from app.models import Album, Artist, Track, TrackHistory, User
from app.spotify.utils.SpotifyWorker import spotify_worker
from app.spotify.utils.spotify_api import get_spotify_users_client
from app.spotify.utils.spotify_token import get_valid_access_token
from app.spotify.utils.api_call import run_spotify_task

router = APIRouter()

@router.get('')
async def refresh(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_session)):
    user = db.exec(select(User).where(User.id == user_id)).scalars().first()
    if not user: raise HTTPException(status_code=401, detail="Utilisateur introuvable")

    if not user.spotify_id:
        raise HTTPException(
            status_code=400, 
            detail="Compte Spotify non lié. Impossible de rafraîchir l'historique."
        )

    await refresh_history(user.id,db)
    return {"status": "success", "message": "Synchronisation terminée."}


async def refresh_history(user_id: int, session: Session, before: str = None, cache_history=None, cache_tracks=None, cache_albums=None, cache_artists=None):
    """
    Récupère l'historique Spotify et remonte dans le temps jusqu'à trouver une écoute déjà enregistrée.
    """
    user = session.get(User,user_id)
    sp = get_spotify_users_client(await get_valid_access_token(user,session))
    after_param = user.last_spotify_sync if before is None else None
    data = await run_spotify_task(sp.current_user_recently_played, limit=50, after=after_param, before=before)
    items = data['items']
    if not items: return True

    # CHARGEMENT DU CACHE (Une seule fois au premier appel)
    if cache_history is None:
        cache_history = set(session.exec(select(TrackHistory.played_at, TrackHistory.spotify_id).where(TrackHistory.user_id == user_id)).all())
        cache_tracks = set(session.exec(select(Track.spotify_id)).scalars().all())
        cache_albums = set(session.exec(select(Album.spotify_id)).scalars().all())
        cache_artists = set(session.exec(select(Artist.spotify_id)).scalars().all())
    
    new_entries, new_tracks, new_albums, new_artists = [], [], [], []
    new_artists_ids, new_albums_ids, new_tracks_ids = set(), set(), set()

    for item in items:
        track = item['track']

        # --- INFOS ARTISTE ---
        primary_artist = track["artists"][0]
        artist_name = primary_artist["name"]
        artist_sid = primary_artist["id"]

        # --- INFOS ALBUM ---
        album = track["album"]
        album_name = album["name"]
        album_sid = album["id"]
        images = album["images"]
        album_image_url = images[0]["url"] if images else None

        # --- INFOS TRACK ---
        sid = track["id"]
        name = track["name"]
        duration_ms = track['duration_ms']

        # --- INFOS ÉCOUTE ---
        played_at = item['played_at']

        if not sid or not played_at: continue
        try: dt_obj = datetime.datetime.fromisoformat(played_at.replace("Z", "+00:00")).replace(tzinfo=None)
        except: continue

        # Vérifier si cette écoute existe déjà en base
        if (dt_obj, sid) in cache_history: continue

        if artist_sid not in cache_artists and artist_sid not in new_artists_ids:
            new_artists.append(Artist(
                spotify_id=artist_sid,
                name=artist_name
            ))
            new_artists_ids.add(artist_sid)
        
        if album_sid not in cache_albums and album_sid not in new_albums_ids:
            new_albums.append(Album(
                spotify_id=album_sid,
                name=album_name,
                image_url=album_image_url,
                artist_id=artist_sid
            ))
            new_albums_ids.add(album_sid)
        
        if sid not in cache_tracks and sid not in new_tracks_ids:
            new_tracks.append(Track(
                spotify_id=sid,
                title=name,
                artist_id=artist_sid,
                album_id=album_sid,
                duration_ms=duration_ms
            ))
            new_tracks_ids.add(sid)

        new_entries.append(TrackHistory(
            user_id=user.id,
            played_at=played_at,
            ms_played=0,
            spotify_id=sid,
            artist_id=artist_sid,
            album_id=album_sid
        ))

    # Sauvegarder les nouveaux morceaux de cette page
    if new_entries:
        for artist in new_artists: session.add(artist)
        for album in new_albums: session.add(album)
        for track in new_tracks: session.add(track)
        for entry in new_entries: session.add(entry)
        session.commit()
        print(f"Ajout de {len(new_entries)} nouvelles écoutes pour {user.display_name}")
    
    if new_artists_ids: await spotify_worker.add_artists(list(new_artists_ids))
    
    # 4. Logique de récursion / Continuité
    # Si on a trouvé au moins un morceau qu'on ne connaissait pas dans les 50,
    # ou si on n'a pas trouvé la "50ème" (all_known est resté False pour certains),
    # on doit vérifier la page précédente.
    cursors = data["cursors"]
    if cursors and cursors["after"]:
        user.last_spotify_sync = cursors["after"]
        before_next = cursors["before"]
        session.add(user)
        session.commit()
        return await refresh_history(
            user_id, session, before=before_next,
            cache_history=cache_history, cache_tracks=cache_tracks, 
            cache_albums=cache_albums, cache_artists=cache_artists
        )