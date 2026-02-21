import base64
from datetime import datetime, timedelta
import os
from urllib.parse import urlencode
import uuid
from typing import Optional
from fastapi import APIRouter, Cookie, Depends, HTTPException
from fastapi.responses import RedirectResponse
import httpx
from sqlmodel import Session, select
from app.database import get_session
from app.models import User
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/auth", tags=["auth"])

CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")
REDIRECT_URI = os.getenv("SPOTIFY_REDIRECT_URI")
FRONTEND_URL = os.getenv("FRONTEND_URL")

@router.get("/login")
def login():
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

@router.get("/callback")
async def callback(code: str, session: Session = Depends(get_session)):
    async with httpx.AsyncClient() as client:
        response = await client.post(
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
        
    # Vérifie si Spotify a répondu une erreur ici
    if response.status_code != 200:
        raise HTTPException(status_code=400, detail="Impossible de récupérer le token Spotify")

    token_data = response.json()
    access_token = token_data["access_token"]
    refresh_token = token_data.get("refresh_token")
    expires_in = token_data.get("expires_in", 3600)
    expiration_date = datetime.now() + timedelta(seconds=expires_in)

    # 2. On demande à Spotify qui est l'utilisateur actuel
    async with httpx.AsyncClient() as client:
        user_res = await client.get(
            "https://api.spotify.com/v1/me",
            headers={"Authorization": f"Bearer {access_token}"}
        )

    # Vérifie que user_res est correct avant le .json()
    if user_res.status_code != 200:
        raise HTTPException(status_code=400, detail="Impossible de récupérer le profil Spotify")

    user_info = user_res.json()

    # 3. On enregistre dans PostgreSQL
    statement = select(User).where(User.spotify_id == user_info["id"])
    user = session.exec(statement).first()

    if not user:
        user = User(
            spotify_id=user_info["id"],
            display_name=user_info.get("display_name", "Inconnu"),
            email=user_info.get("email", "no-email"),
            refresh_token=token_data["refresh_token"],
            access_token=access_token,
            expires_at=expiration_date
        )
        session.add(user)
    else:
        # Si l'utilisateur existe, on met juste à jour son refresh_token
        user.access_token = access_token
        user.refresh_token = refresh_token
        user.expires_at = expiration_date
    
    if not user.session_id:
        user.session_id = str(uuid.uuid4())

    session.add(user)
    session.commit()

    # 1. On s'assure que l'utilisateur a un session_id
    if not user.session_id:
        user.session_id = str(uuid.uuid4())
        session.add(user)
        session.commit()

    # 2. On crée la réponse de redirection
    response = RedirectResponse(url=FRONTEND_URL)
    response.set_cookie(
        key="session_id",
        value=user.session_id,
        httponly=True,
        samesite="none",
        secure=True,
        max_age=3600 * 24 * 7,
        path="/"
    )
    return response

@router.get("/logout")
async def logout():
    response = RedirectResponse(url=FRONTEND_URL)
    # On supprime le cookie de session
    # On utilise 'delete_cookie' avec le même nom que lors de la création
    response.delete_cookie(
        key="session_id", 
        path="/", 
        domain="127.0.0.1"
    )
    return response

@router.get("/me")
async def get_me(session_id: Optional[str] = Cookie(None), db: Session = Depends(get_session)):
    # Si le navigateur n'envoie pas de cookie, session_id sera None
    if not session_id:
        return {"is_logged_in": False}
    
    # On cherche l'utilisateur qui possède ce session_id précis
    statement = select(User).where(User.session_id == session_id)
    user = db.exec(statement).first()

    if not user:
        return {"is_logged_in": False}
    
    return {
        "is_logged_in": True,
        "user_name": user.display_name
    }

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