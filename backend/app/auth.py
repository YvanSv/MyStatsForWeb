import os
from typing import Optional
from fastapi import APIRouter, Cookie, Depends, HTTPException
from fastapi.responses import RedirectResponse
import httpx
from sqlmodel import Session, select
from app.database import get_session
from app.models import User
from dotenv import load_dotenv
from .database import get_session
from .models import User

load_dotenv()

router = APIRouter(prefix="/auth", tags=["auth"])

CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")
REDIRECT_URI = os.getenv("SPOTIFY_REDIRECT_URI")

@router.get("/login")
def login():
    # Les permissions (scopes) pour lire ton historique
    scope = "user-read-recently-played user-top-read user-read-private user-read-email"
    
    # On construit l'URL de connexion Spotify
    url = (
        f"https://accounts.spotify.com/authorize?response_type=code"
        f"&client_id={CLIENT_ID}&scope={scope}&redirect_uri={REDIRECT_URI}"
    )
    return RedirectResponse(url)

@router.get("/callback")
async def callback(code: str, session: Session = Depends(get_session)):
    # 1. On échange le 'code' reçu contre des Tokens (Access et Refresh)
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
    
    token_data = response.json()
    if "error" in token_data:
        raise HTTPException(status_code=400, detail=token_data.get("error_description", "Erreur Token"))

    # 2. On demande à Spotify qui est l'utilisateur actuel
    access_token = token_data["access_token"]
    async with httpx.AsyncClient() as client:
        user_res = await client.get(
            "https://api.spotify.com/v1/me",
            headers={"Authorization": f"Bearer {access_token}"}
        )
    user_info = user_res.json()

    # 3. On enregistre dans PostgreSQL
    statement = select(User).where(User.spotify_id == user_info["id"])
    user = session.exec(statement).first()

    if not user:
        user = User(
            spotify_id=user_info["id"],
            display_name=user_info.get("display_name", "Inconnu"),
            email=user_info.get("email", "no-email"),
            refresh_token=token_data["refresh_token"]
        )
        session.add(user)
    else:
        # Si l'utilisateur existe, on met juste à jour son refresh_token
        user.refresh_token = token_data["refresh_token"]
    
    session.commit()
    return RedirectResponse(url="http://localhost:3001/dashboard?login=success")

@router.get("/logout")
async def logout():
    response = RedirectResponse(url="http://localhost:3001")
    # On supprime le cookie de session
    # On utilise 'delete_cookie' avec le même nom que lors de la création
    response.delete_cookie(
        key="session_id", 
        path="/", 
        domain="localhost"
    )
    
    return response

@router.get("/me")
async def get_me(session_id: Optional[str] = Cookie(None), db: Session = Depends(get_session)):
    if not session_id:
        return {"is_logged_in": False}
    
    statement = select(User).where(User.session_id == session_id)
    user = db.exec(statement).first()

    if not user:
        return {"is_logged_in": False}
    
    return {
        "is_logged_in": True,
        "user_name": user.display_name
    }