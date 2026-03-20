import asyncio
from typing import Optional
from fastapi import APIRouter, Cookie, HTTPException, Depends
from sqlmodel import Session, select, func, desc, text
from sqlalchemy.orm import joinedload
from app.database import get_session
from app.models import User, TrackHistory, Track, Artist, Album
from app.response_message import UserProfileResponse, BaseUserProfile, UserProfileTopsResponse
from app.spotify.utils.api_call import run_spotify_task
from app.spotify.utils.spotify_api import get_spotify_users_client
from app.spotify.utils.spotify_token import get_valid_access_token

def get_optional_user(session_id: Optional[str], db: Session):
    if not session_id:
        return None
    return db.exec(select(User).where(User.session_id == session_id)).first()

router = APIRouter()

@router.get(
    "/{slug}",
    summary="Récupérer le profil public d'un utilisateur",
    response_model=UserProfileResponse,
    responses={
        200: {"description": "Profil récupéré avec succès (données filtrées par permissions)."},
        403: {"description": "Profil privé ou accès refusé."},
        404: {"description": "L'utilisateur n'existe pas."}
    }
)
async def get_user_profile(slug: str, session: Session = Depends(get_session), session_id: Optional[str] = Cookie(None)):
    """
    Génère une page de profil complète incluant l'identité et les habitudes d'écoute.

    **Logique d'accès (Privacy first) :**
    - **Identification** : Le système détermine si le visiteur est le propriétaire du profil.
    - **Permissions granulaires** : Chaque section (Stats, Favoris, Historique) n'est calculée et affichée que si :
        1. L'utilisateur a activé la permission dans ses réglages.
        2. OU le visiteur est le propriétaire.
    
    **Calculs SQL à la volée :**
    - **Top 50** : Agrégation par morceaux, artistes et albums basée sur le `play_count`.
    - **Heure de pointe** : Extraction de l'heure (`func.extract`) la plus fréquente dans l'historique.
    - **Fallback visuel** : Utilisation de DiceBear (avatars) et Unsplash (bannières) si l'utilisateur n'a pas personnalisé son profil.
    """
    if slug.isdigit(): target_user = session.get(User, int(slug))
    else: target_user = session.exec(select(User).where(User.slug == slug)).first()
    if not target_user: raise HTTPException(status_code=404, detail="Profil introuvable")

    # Identifier qui regarde (le visiteur)
    visitor = get_optional_user(session_id, session)
    is_owner = visitor is not None and visitor.id == target_user.id
    # On bloque si le profil est privé ET que ce n'est pas le proprio
    if not target_user.perms.get("profile", True) and not is_owner: raise HTTPException(status_code=403, detail="Profil privé")

    # --- INITIALISATION ---
    top_tracks, top_artists, top_albums = [], [], []
    total_minutes,total_streams = 0,0
    top_track,top_artist = None,None

    # --- TOP 50 TRACKS ---
    if target_user.perms.get("favorites", True) or is_owner:
        top_tracks_raw = get_top_entities(session, Track, TrackHistory.spotify_id,target_user.id,50)
        top_tracks = [{"name": t.title,"image_url": alb.image_url,"sub": art.name,"count": count} for t, count, art, alb  in top_tracks_raw]

        top_artists_raw = get_top_entities(session, Artist, TrackHistory.artist_id,target_user.id,50)
        top_artists = [{
            "name": art.name,
            "image_url": art.image_url or f"https://api.dicebear.com/7.x/initials/svg?seed={art.name}",
            "sub": f"{count} streams",
            "count": count
        } for art, count in top_artists_raw]

        top_albums_raw = get_top_entities(session, Album, TrackHistory.album_id,target_user.id,50)
        top_albums = [{"name": alb.name,"image_url": alb.image_url,"sub": art.name,"count": count} for alb, count, art in top_albums_raw]

    # --- STATS GLOBALES (Minutes & Streams) ---
    if target_user.perms.get("stats", True) or is_owner:
        stats = get_stats(target_user.id,session)
        total_minutes = stats.get("min", 0)
        total_streams = stats.get("str", 0)

    return {
        "display_name": target_user.display_name,
        "avatar": target_user.avatar_url or f"https://api.dicebear.com/7.x/avataaars/svg?seed={target_user.id}",
        "bio": target_user.bio or "Aucune biographie.",
        "banner": target_user.banner_url or "/banner_template.jpg",
        "total_minutes": total_minutes,
        "total_streams": total_streams,
        # --- HEURE DE POINTE (Peak Hour) ---
        "peak_hour": get_peak_hour(target_user.id,session) if target_user.perms.get("stats", True) or is_owner else "N/A",
        "top_50_tracks": top_tracks,
        "top_50_artists": top_artists,
        "top_50_albums": top_albums,
        # --- 50 DERNIÈRES ÉCOUTES ---
        "recent_tracks": get_historique(target_user,50,session) if target_user.perms.get("history", True) or is_owner else [],
        "perms": target_user.perms,
    }

@router.get(
    "/simple/{slug}",
    summary="Récupérer des données simplifiées du profil",
    response_model=BaseUserProfile,
    responses={
        200: {"description": "Profil récupéré avec succès (données filtrées par permissions)."},
        403: {"description": "Profil privé ou accès refusé."},
        404: {"description": "L'utilisateur n'existe pas."}
    }
)
def get_user_simple_profile(slug: str, session: Session = Depends(get_session), session_id: Optional[str] = Cookie(None)):
    """
    Génère des données simplifiées du profil pour les afficher rapidement sur les metadatas.

    **Logique d'accès (Privacy first) :**
    - **Identification** : Le système détermine si le visiteur est le propriétaire du profil.
    - **Permissions granulaires** : Chaque section (Stats, Favoris, Historique) n'est calculée et affichée que si :
        1. L'utilisateur a activé la permission dans ses réglages.
        2. OU le visiteur est le propriétaire.
    
    **Calculs SQL à la volée :**
    - **Fallback visuel** : Utilisation de DiceBear (avatars) et Unsplash (bannières) si l'utilisateur n'a pas personnalisé son profil.
    """
    if slug.isdigit(): target_user = session.get(User, int(slug))
    else: target_user = session.exec(select(User).where(User.slug == slug)).first()
    if not target_user: raise HTTPException(status_code=404, detail="Profil introuvable")

    # Identifier qui regarde (le visiteur)
    visitor = get_optional_user(session_id, session)
    is_owner = visitor is not None and visitor.id == target_user.id
    # On bloque si le profil est privé ET que ce n'est pas le proprio
    if not target_user.perms.get("profile", True) and not is_owner: raise HTTPException(status_code=403, detail="Profil privé")

    return {
        "display_name": target_user.display_name,
        "avatar": target_user.avatar_url or f"https://api.dicebear.com/7.x/avataaars/svg?seed={target_user.id}",
        "bio": target_user.bio or "Aucune biographie.",
        "banner": target_user.banner_url or "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=2070",
        "perms": target_user.perms
    }

def get_historique(target_user: User, limit: int,session: Session):
    recent_history = session.exec(
        select(TrackHistory)
        .where(TrackHistory.user_id == target_user.id)
        .options(
            joinedload(TrackHistory.track),
            joinedload(TrackHistory.track).joinedload(Track.artist),
            joinedload(TrackHistory.track).joinedload(Track.album)
        )
        .order_by(desc(TrackHistory.played_at))
        .limit(limit)
    ).all()
    return [{
        "id": h.id,
        "title": h.track.title if h.track else "Inconnu",
        "album": h.track.album.name if h.track and h.track.album else "Inconnu",
        "artist": h.track.artist.name if h.track and h.track.artist else "Inconnu",
        "image_url": h.track.album.image_url if h.track and h.track.album else None,
        "played_at": h.played_at
    } for h in recent_history]

def get_stats(user_id: int, session: Session):
    stats = session.exec(
        select(
            func.coalesce(func.sum(TrackHistory.ms_played), 0).label("total_ms"),
            func.count(TrackHistory.id).label("total_streams")
        ).where(TrackHistory.user_id == user_id)
    ).first()
    return {
        "min":int((stats.total_ms) // 60000),
        "str":stats.total_streams
    }

def get_peak_hour(user_id: int, session: Session):
    hour_expr = func.extract('hour', TrackHistory.played_at)
    peak_hour_res = session.exec(
        select(
            hour_expr.label("hour"),
            func.count(TrackHistory.id).label("count")
        )
        .where(TrackHistory.user_id == user_id)
        .group_by(hour_expr)
        .order_by(desc(text("count")))
        .limit(1)
    ).first()
    return f"{int(peak_hour_res[0])}h" if peak_hour_res is not None else "N/A"

def get_top_entities(session, model, history_id_col, user_id, limit=50):
    """
    Fonction générique pour récupérer les Tops (Tracks, Artists ou Albums).
    """
    group_cols = [model.spotify_id]
    statement = (
        select(model, func.count(TrackHistory.id).label("play_count"))
        .join(model, history_id_col == model.spotify_id)
        .where(TrackHistory.user_id == user_id)
    )
    # Pour une Track, on veut l'Artiste et l'Album (pour le nom et l'image)
    if model == Track:
        statement = statement.join(Artist, model.artist_id == Artist.spotify_id).add_columns(Artist)
        statement = statement.join(Album, model.album_id == Album.spotify_id).add_columns(Album)
        group_cols.extend([Artist.spotify_id, Album.spotify_id])
    # Pour un Album, on veut juste l'Artiste (pour le nom de l'auteur)
    elif model == Album:
        statement = statement.join(Artist, model.artist_id == Artist.spotify_id).add_columns(Artist)
        group_cols.extend([Artist.spotify_id])
    
    statement = statement.group_by(*group_cols).order_by(desc("play_count")).limit(limit)
    return session.exec(statement).all()

@router.get(
    "/tops/{slug}",
    summary="Récupérer les tops track et artist d'un profil public d'un utilisateur",
    response_model=UserProfileTopsResponse,
    responses={
        200: {"description": "Tops récupérés avec succès"},
        403: {"description": "Profil privé ou accès refusé."},
        404: {"description": "L'utilisateur n'existe pas."}
    }
)
async def get_top_track_and_artist(slug: str, session: Session = Depends(get_session), session_id: Optional[str] = Cookie(None)):
    """
    Fonction générique pour récupérer les Tops (Track, Artist) via l'API Spotify.
    """
    if slug.isdigit(): target_user = session.get(User, int(slug))
    else: target_user = session.exec(select(User).where(User.slug == slug)).first()
    if not target_user: raise HTTPException(status_code=404, detail="Profil introuvable")

    # Identifier qui regarde (le visiteur)
    visitor = get_optional_user(session_id, session)
    is_owner = visitor is not None and visitor.id == target_user.id
    # On bloque si le profil est privé ET que ce n'est pas le proprio
    if not target_user.perms.get("profile", True) and not is_owner: raise HTTPException(status_code=403, detail="Profil privé")
    
    sp = get_spotify_users_client(await get_valid_access_token(target_user,session))
    top_tr_task = run_spotify_task(sp.current_user_top_tracks, limit=1, time_range="long_term")
    top_ar_task = run_spotify_task(sp.current_user_top_artists, limit=1, time_range="long_term")
    top_tr, top_ar = await asyncio.gather(top_tr_task, top_ar_task)
    track = top_tr["items"][0] if top_tr.get("items") else None
    artist = top_ar["items"][0] if top_ar.get("items") else None

    res = {"top_track": None,"top_artist": None}

    if track:
        res["top_track"] = {
            "name": track["name"],
            "img_url": track["album"]["images"][0]["url"] if track["album"]["images"] else None,
            "rating": track.get("popularity", 0),
            "isTrack": True,
            "artist_name": track["artists"][0]["name"],
            "album_name": track["album"]["name"]
        }
    if artist:
        res["top_artist"] = {
            "name": artist["name"],
            "img_url": artist["images"][0]["url"] if artist["images"] else None,
            "rating": artist.get("popularity", 0),
            "isTrack": False
        }
    return res