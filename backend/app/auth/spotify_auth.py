from datetime import datetime, timedelta, timezone
import os
from typing import Optional
from urllib.parse import urlencode
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import RedirectResponse
import httpx
from sqlmodel import Session, select
from app.models import MusicProvider, User, UserAccount
from app.database import get_session
from .utils.auth_utils import create_uuid_session, set_session_cookie, set_spotify_state_cookie

load_dotenv()

CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")
REDIRECT_URI = os.getenv("SPOTIFY_REDIRECT_URI")
FRONTEND_URL = os.getenv("FRONTEND_URL")

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
    - `user-modify-playback-state` : Permet les contrôles de lecture (pause, reprise, suivant, précédent) — Spotify Premium requis.
    - `user-top-read` : Utilisé pour générer les classements des 50 meilleurs titres/artistes.
    - `user-read-private` / `user-read-email` : Essentiel pour la création et la liaison du compte MyStatsfy.
    """
    set_spotify_state_cookie(response)

    # Liste des scopes pour accéder aux données de l'utilisateur
    scopes = [
        "user-read-recently-played",
        "user-read-currently-playing",
        "user-read-playback-state",
        "user-modify-playback-state",
        "user-top-read",
        "user-read-private",
        "user-read-email"
    ]
    
    params = {
        "client_id": CLIENT_ID,
        "response_type": "code",
        "scope": " ".join(scopes),
        "redirect_uri": REDIRECT_URI,
        "show_dialog": "true"
    }

    return RedirectResponse(f"https://accounts.spotify.com/authorize?{urlencode(params)}")

@router.get("/callback", summary="Callback Spotify : Échange du code et liaison")
async def callback(
    request: Request,
    code: Optional[str] = None,
    error: Optional[str] = None,
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
    # --- GESTION DES ERREURS (Inchangé) ---
    if error:
        return RedirectResponse(url=f"{FRONTEND_URL}/auth?error={error}")
    if not code: 
        return RedirectResponse(url=f"{FRONTEND_URL}/auth?error=missing_code")

    async with httpx.AsyncClient() as client:
        # 1. Échange du code contre les tokens (Inchangé)
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
        if token_res.status_code != 200: 
            return RedirectResponse(url=f"{FRONTEND_URL}/auth?error=spotify_token_error")

        token_data = token_res.json()
        access_token = token_data["access_token"]
        refresh_token = token_data.get("refresh_token")
        # UTC naïf : la colonne expires_at est un timestamp sans fuseau
        expiration_date = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(seconds=token_data.get("expires_in", 3600))

        # 2. Récupération du profil Spotify (Inchangé)
        user_res = await client.get(
            "https://api.spotify.com/v1/me",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        if user_res.status_code != 200: 
            return RedirectResponse(url=f"{FRONTEND_URL}/auth?error=spotify_profile_error")

        user_info = user_res.json()
        spotify_id = user_info["id"]
        spotify_email = user_info.get("email")

    # --- NOUVELLE LOGIQUE DE RÉCONCILIATION ---
    current_session_id = request.cookies.get("session_id")
    user = None
    target_path = "/"

    # A. On cherche si ce compte Spotify est déjà lié à QUELQU'UN
    account_statement = select(UserAccount).where(
        UserAccount.provider == MusicProvider.SPOTIFY,
        UserAccount.provider_user_id == spotify_id
    )
    existing_account = session.exec(account_statement).first()

    # B. Stratégie pour trouver l'utilisateur "User"
    if current_session_id:
        # L'utilisateur est déjà connecté à son compte MyStatsfy (Email/Pass)
        user = session.exec(select(User).where(User.session_id == current_session_id)).first()
        if user: target_path = "/account?linked=true"
    
    if not user and existing_account:
        # Reconnexion simple : On a trouvé le compte Spotify, on prend l'user associé
        user = session.exec(select(User).where(User.id == existing_account.user_id)).first()
    
    if not user and spotify_email:
        # Fusion par email : L'utilisateur n'est pas loggé mais son email Spotify matche un User
        user = session.exec(select(User).where(User.email == spotify_email)).first()
        if user: target_path = "/account?linked=true"

    # C. Création de l'utilisateur si vraiment rien trouvé
    if not user:
        user = User(
            email=spotify_email or f"{spotify_id}@spotify.user",
            display_name=user_info.get("display_name", "Inconnu"),
            session_id=create_uuid_session()
        )
        session.add(user)
        session.flush() # Pour récupérer user.id

    # D. Mise à jour ou création du UserAccount (Le lien technique)
    if existing_account and existing_account.user_id != user.id:
        # Sécurité : Le compte Spotify est déjà lié à un AUTRE utilisateur
        return RedirectResponse(url=f"{FRONTEND_URL}/account?error=spotify_already_linked")

    if not existing_account:
        existing_account = UserAccount(
            provider=MusicProvider.SPOTIFY,
            provider_user_id=spotify_id,
            user_id=user.id
        )
    
    # Mise à jour des tokens dans UserAccount
    existing_account.provider_email = spotify_email
    existing_account.access_token = access_token
    if refresh_token: 
        existing_account.refresh_token = refresh_token
    existing_account.expires_at = expiration_date
    
    session.add(existing_account)

    # On s'assure que l'utilisateur a une session_id pour le cookie
    if not user.session_id:
        user.session_id = create_uuid_session()
        session.add(user)

    session.commit()
    
    # --- RÉPONSE ET COOKIE (Inchangé) ---
    response = RedirectResponse(url=f"{FRONTEND_URL}{target_path}")
    set_session_cookie(response, user.session_id)
    return response