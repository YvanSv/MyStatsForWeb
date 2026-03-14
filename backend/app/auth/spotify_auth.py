import base64
from datetime import datetime, timedelta, timezone
import os
import secrets
from typing import Optional
from urllib.parse import urlencode
import uuid
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import RedirectResponse
import httpx
from sqlmodel import Session, select
from app.models import User
from app.database import get_session
from app.response_message import DetailMessage

load_dotenv()

CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")
REDIRECT_URI = os.getenv("SPOTIFY_REDIRECT_URI")
FRONTEND_URL = os.getenv("FRONTEND_URL")
IS_PRODUCTION = os.getenv("RENDER") is not None or os.getenv("ENV") == "production"

router = APIRouter(prefix="/auth")

@router.get(
    "/spotify-login",
    summary="Initier la connexion Spotify",
    responses={
        302: {
            "description": "Redirection vers l'URL d'autorisation de Spotify",
            "headers": {
                "Location": {
                    "description": "URL de Spotify contenant client_id, scope et redirect_uri",
                    "schema": {"type": "string"}
                }
            }
        }
    }
)
def spotify_login(response: Response):
    """
    Construit l'URL d'authentification Spotify et redirige l'utilisateur vers le portail de consentement.

    **Fonctionnement technique :**
    1. Définit les privilèges (Scopes) nécessaires à MyStatsfy.
    2. Encode les paramètres de sécurité et d'identification.
    3. Renvoie un code de statut **302 Found** pour forcer le navigateur à changer de domaine.

    **Permissions demandées (Scopes) :**
    - `user-read-recently-played` : Nécessaire pour synchroniser l'historique d'écoute.
    - `user-top-read` : Utilisé pour générer les classements des 50 meilleurs titres/artistes.
    - `user-read-private` / `user-read-email` : Essentiel pour la création et la liaison du compte MyStatsfy.
    """
    state = secrets.token_urlsafe(16)

    response.set_cookie(
        key="spotify_auth_state",
        value=state,
        httponly=True,
        max_age=600, 
        samesite="none",
        secure=IS_PRODUCTION
    )

    # Liste des scopes pour accéder aux données de l'utilisateur
    scopes = [
        "user-read-recently-played",
        "user-top-read",
        "user-read-private",
        "user-read-email"
    ]
    
    params = {
        "client_id": CLIENT_ID,
        "response_type": "code",
        "scope": " ".join(scopes),
        "redirect_uri": REDIRECT_URI,
        "state": state,
        "show_dialog": "true"
    }
    
    return RedirectResponse(f"https://accounts.spotify.com/authorize?{urlencode(params)}")

# @router.post(
#     "/unlink-spotify",
#     summary="Délier le compte Spotify",
#     response_model=UnlinkSuccessResponse,
#     responses={
#         401: {"model": DetailMessage},
#         404: {"model": DetailMessage}
#     }
# )
# async def unlink_spotify(
#     session_id: Optional[str] = Cookie(None), 
#     session: Session = Depends(get_session)
# ):
#     """
#     Supprime les jetons et identifiants Spotify du profil utilisateur.

#     **Effets :**
#     1. Réinitialise `spotify_id` et `spotify_email`.
#     2. Efface les jetons OAuth (`access_token`, `refresh_token`).
#     3. L'utilisateur garde son compte MyStatsfy mais ses statistiques ne seront plus synchronisées.
#     """
#     if not session_id: raise HTTPException(status_code=401, detail="Non authentifié")
#     user = session.exec(select(User).where(User.session_id == session_id)).first()
#     if not user: raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

#     user.spotify_id = None
#     user.spotify_email = None
#     user.access_token = None
#     user.refresh_token = None
#     user.expires_at = None
    
#     session.add(user)
#     session.commit()

#     return UnlinkSuccessResponse()

@router.get(
    "/callback",
    summary="Callback Spotify : Échange du code et liaison",
    responses={
        302: {"description": "Redirection vers le Frontend (/account ou /dashboard)"},
        400: {"model": DetailMessage}
    }
)
async def callback(
    request: Request,
    code: Optional[str] = None,
    error: Optional[str] = None,
    state: Optional[str] = None,
    session: Session = Depends(get_session)
):
    """
    Point d'entrée pour le retour d'authentification de Spotify.
    
    Cette fonction réalise le flux d'authentification complet :
    
    1. **Échange de jetons** : Échange le code d'autorisation contre un `access_token` (valide 1h) et un `refresh_token` (permanent).
    2. **Identification** : Appelle l'API Spotify `/me` pour obtenir l'identifiant unique et l'email de l'utilisateur.
    3. **Stratégie de réconciliation (Liaison)** :
        * **Cas A (Liaison)** : Si l'utilisateur est déjà connecté à MyStatsfy, lie le compte Spotify à son profil actuel.
        * **Cas B (Reconnexion)** : Si non connecté, cherche un utilisateur existant avec cet ID Spotify.
        * **Cas C (Fusion)** : Si l'email Spotify correspond à un compte existant créé par mot de passe, fusionne les accès.
        * **Cas D (Inscription)** : Si aucun compte n'existe, crée un nouvel utilisateur MyStatsfy.
    4. **Session** : Génère ou met à jour le `session_id` et l'enregistre dans un cookie sécurisé (HttpOnly).
    
    **Redirections :**
    - Vers `/account?linked=true` en cas de liaison réussie.
    - Vers `/` pour une connexion standard.
    - Vers `/account?error=...` en cas de conflit (compte Spotify déjà lié ailleurs).
    """
    # 1. Vérification du STATE (Anti-CSRF)
    stored_state = request.cookies.get("spotify_auth_state")
    if IS_PRODUCTION and (not state or state != stored_state): return RedirectResponse(url=f"{FRONTEND_URL}/auth?error=state_mismatch")

    # --- GESTION DE L'ANNULATION OU DES ERREURS SPOTIFY ---
    if error:
        # Si l'utilisateur a cliqué sur "Annuler"
        if error == "access_denied": return RedirectResponse(url=f"{FRONTEND_URL}/auth")
        # Pour toute autre erreur venant de Spotify
        return RedirectResponse(url=f"{FRONTEND_URL}/auth?error={error}")

    # Si on n'a ni code ni erreur (accès direct louche à l'URL)
    if not code: return RedirectResponse(url=f"{FRONTEND_URL}/auth?error=missing_code")

    async with httpx.AsyncClient() as client:
        # 1. Échange du code contre les tokens
        token_res = await client.post(
            "https://accounts.spotify.com/api/token",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": REDIRECT_URI,
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        
        if token_res.status_code != 200: return RedirectResponse(url=f"{FRONTEND_URL}/auth?error=spotify_token_error")

        token_data = token_res.json()
        access_token = token_data["access_token"]
        refresh_token = token_data.get("refresh_token")
        expires_in = token_data.get("expires_in", 3600)
        # Calcul de la date d'expiration
        expiration_date = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

        # Récupération du profil Spotify
        user_res = await client.get(
            "https://api.spotify.com/v1/me",
            headers={"Authorization": f"Bearer {access_token}"}
        )

        if user_res.status_code != 200: return RedirectResponse(url=f"{FRONTEND_URL}/auth?error=spotify_profile_error")

        user_info = user_res.json()
        spotify_id = user_info["id"]
        spotify_email = user_info.get("email")

    # --- LOGIQUE DE RÉCONCILIATION ---
    current_session_id = request.cookies.get("session_id")
    user = None
    target_path = "/"

    # Cas A : Utilisateur déjà loggé par email -> On lie le compte Spotify
    if current_session_id:
        user = session.exec(select(User).where(User.session_id == current_session_id)).first()
        if user: target_path = "/account?linked=true"

    # Cas B : Pas loggé -> On cherche par ID Spotify (reconnexion)
    if not user: user = session.exec(select(User).where(User.spotify_id == spotify_id)).first()

    # Cas C : Pas d'ID Spotify -> On cherche par Email (fusion automatique)
    if not user and spotify_email:
        user = session.exec(select(User).where(User.email == spotify_email)).first()
        if user: target_path = "/account?linked=true"

    # Traitement Final : Création ou Mise à jour
    if not user:
        # Inscription (Nouveau compte)
        user = User(
            spotify_id=spotify_id,
            display_name=user_info.get("display_name", "Inconnu"),
            email=spotify_email or f"{spotify_id}@spotify.user",
            spotify_email=spotify_email,
            refresh_token=refresh_token,
            access_token=access_token,
            expires_at=expiration_date,
            session_id=str(uuid.uuid4())
        )
        session.add(user)
    else:
        # Sécurité : Vérifier si ce Spotify ID n'appartient pas déjà à quelqu'un d'autre
        conflict = session.exec(select(User).where(User.spotify_id == spotify_id, User.id != user.id)).first()
        if conflict: return RedirectResponse(url=f"{FRONTEND_URL}/account?error=spotify_already_linked")
        
        # Mise à jour des infos
        user.spotify_id = spotify_id
        user.spotify_email = spotify_email
        user.access_token = access_token
        if refresh_token: user.refresh_token = refresh_token
        user.expires_at = expiration_date
        
        # On s'assure qu'il a une session active
        if not user.session_id: user.session_id = str(uuid.uuid4())
        session.add(user)

    session.commit()
    session.refresh(user)
    response = RedirectResponse(url=f"{FRONTEND_URL}{target_path}")
    response.delete_cookie("spotify_auth_state", path="/")
    response.set_cookie(
        key="session_id",
        value=user.session_id,
        httponly=True,
        samesite="none" if IS_PRODUCTION else "lax",
        secure=IS_PRODUCTION,
        max_age=3600 * 24 * 30, # 30 jours
        path="/"
    )
    return response

async def get_valid_access_token(user: User, db: Session):
    # Si le token expire dans moins de 60 secondes, on rafraîchit
    if not user.expires_at or datetime.now() >= (user.expires_at - timedelta(seconds=60)):
        return await refresh_spotify_token(user, db, CLIENT_ID, CLIENT_SECRET)
    return user.access_token

async def refresh_spotify_token(user: User, db: Session, client_id: str, client_secret: str):
    # 1. Préparer l'encodage Basic Auth pour Spotify
    auth_header = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
    
    url = "https://accounts.spotify.com/api/token"
    payload = {
        "grant_type": "refresh_token",
        "refresh_token": user.refresh_token,
    }
    headers = {
        "Authorization": f"Basic {auth_header}",
        "Content-Type": "application/x-www-form-urlencoded",
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, data=payload, headers=headers)
        
    if response.status_code == 200:
        data = response.json()
        
        # 2. Mettre à jour l'utilisateur avec le nouveau token
        user.access_token = data["access_token"]
        # On calcule la nouvelle date d'expiration (en général dans 3600 secondes)
        user.expires_at = datetime.now() + timedelta(seconds=data["expires_in"])
        
        # Note: Spotify peut parfois renvoyer un NOUVEAU refresh_token aussi
        if "refresh_token" in data:
            user.refresh_token = data["refresh_token"]
            
        db.add(user)
        db.commit()
        db.refresh(user)
        return user.access_token
    else:
        # Si le refresh_token est révoqué par l'utilisateur
        raise Exception("Impossible de rafraîchir le token Spotify")