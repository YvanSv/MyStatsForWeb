import base64
from datetime import datetime, timedelta
import os
from typing import Optional
from urllib.parse import urlencode
import uuid
from dotenv import load_dotenv
from fastapi import APIRouter, Cookie, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
import httpx
from pydantic import BaseModel
from sqlmodel import Session, select
from app.models import User
from app.database import get_session

load_dotenv()

CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")
REDIRECT_URI = os.getenv("SPOTIFY_REDIRECT_URI")
FRONTEND_URL = os.getenv("FRONTEND_URL")
IS_PRODUCTION = os.getenv("RENDER") is not None or os.getenv("ENV") == "production"

router = APIRouter(prefix="/auth", tags=["auth"])

class UpdateProfileSchema(BaseModel):
    username: Optional[str] = None

@router.get("/spotify-login")
def spotify_login():
    scope = "user-read-recently-played user-top-read user-read-private user-read-email"
    base_url = "https://accounts.spotify.com/authorize"
    params = {
        "client_id": CLIENT_ID,
        "response_type": "code",
        "scope": scope,
        "redirect_uri": REDIRECT_URI,
        "show_dialog": "true" 
    }
    auth_url = f"{base_url}?{urlencode(params)}"
    return RedirectResponse(auth_url)

@router.post("/unlink-spotify")
async def unlink_spotify(
    session_id: Optional[str] = Cookie(None), 
    session: Session = Depends(get_session)
):
    if not session_id: raise HTTPException(status_code=401, detail="Non authentifié")
    statement = select(User).where(User.session_id == session_id)
    user = session.exec(statement).first()
    if not user: raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    # On remet à zéro les champs Spotify
    user.spotify_id = None
    user.spotify_email = None
    user.access_token = None
    user.refresh_token = None
    user.expires_at = None
    session.add(user)
    session.commit()
    return {"status": "success", "message": "Spotify délié"}

@router.get("/callback")
async def callback(
    request: Request,
    code: str, 
    session: Session = Depends(get_session)
):
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
        
        if token_res.status_code != 200:
            raise HTTPException(status_code=400, detail="Impossible de récupérer le token Spotify")

        token_data = token_res.json()
        access_token = token_data["access_token"]
        refresh_token = token_data.get("refresh_token")
        expires_in = token_data.get("expires_in", 3600)
        expiration_date = datetime.now() + timedelta(seconds=expires_in)

        # 2. Récupération du profil Spotify
        user_res = await client.get(
            "https://api.spotify.com/v1/me", # URL officielle API Spotify
            headers={"Authorization": f"Bearer {access_token}"}
        )

        if user_res.status_code != 200:
            raise HTTPException(status_code=400, detail="Impossible de récupérer le profil Spotify")

        user_info = user_res.json()
        spotify_id = user_info["id"]
        spotify_email = user_info.get("email")

    # --- LOGIQUE DE LIAISON / AUTHENTIFICATION ---

    # A. On vérifie si l'utilisateur est déjà loggé (Liaison de compte)
    current_session_id = request.cookies.get("session_id")
    user = None
    if current_session_id: user = session.exec(select(User).where(User.session_id == current_session_id)).first()

    # B. Si pas loggé, on cherche par spotify_id (Connexion classique Spotify)
    if not user: user = session.exec(select(User).where(User.spotify_id == spotify_id)).first()

    # C. Si toujours rien, on tente la fusion par email (Sécurité de compte)
    if not user and spotify_email: user = session.exec(select(User).where(User.email == spotify_email)).first()

    # D. Traitement (Création ou Mise à jour)
    endpoint = ""
    if not user:
        # Premier login Spotify (Nouvel utilisateur)
        user = User(
            spotify_id=spotify_id,
            display_name=user_info.get("display_name", "Inconnu"),
            email=spotify_email or "no-email",
            spotify_email=spotify_email,
            refresh_token=refresh_token,
            access_token=access_token,
            expires_at=expiration_date,
            session_id=str(uuid.uuid4())
        )
        session.add(user)
    else:
        # Vérifier si le compte Spotify n'est pas déjà lié à un autre compte
        existing_link = session.exec(select(User).where(User.spotify_id == spotify_id, User.id != user.id)).first()
        if existing_link: return RedirectResponse(url=f"{FRONTEND_URL}/edit?error=spotify_already_linked")
        # Liaison à un compte existant ou mise à jour des tokens
        user.spotify_id = spotify_id
        user.spotify_email = spotify_email
        user.access_token = access_token
        # Le refresh_token n'est pas toujours renvoyé par Spotify lors d'une reconnexion
        if refresh_token: user.refresh_token = refresh_token
        user.expires_at = expiration_date
        if not user.session_id: user.session_id = str(uuid.uuid4())
        session.add(user)
        endpoint = "/edit?linked=true"

    session.commit()
    session.refresh(user)

    # 3. Réponse et Cookie
    response = RedirectResponse(url=f"{FRONTEND_URL}{endpoint}")
    response.set_cookie(
        key="session_id",
        value=user.session_id,
        httponly=True,
        samesite="none" if IS_PRODUCTION else "lax",
        secure=IS_PRODUCTION,
        max_age=3600 * 24 * 30,
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