import base64
from datetime import datetime, timedelta
import os
import httpx
from sqlmodel import Session
from app.models import User

CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")

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