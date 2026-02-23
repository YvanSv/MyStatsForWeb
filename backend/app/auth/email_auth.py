import os
from typing import Optional
from dotenv import load_dotenv
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel, EmailStr
from sqlmodel import Session, select
from app.database import get_session
from app.models import User
from app.utils.auth_utils import create_uuid_session, get_password_hash, verify_password
from app.auth.spotify_auth import UpdateProfileSchema

load_dotenv()
FRONTEND_URL = os.getenv("FRONTEND_URL")
IS_PRODUCTION = os.getenv("RENDER") is not None or os.getenv("ENV") == "production"
router = APIRouter(prefix="/auth", tags=["auth"])

class LoginSchema(BaseModel):
    email: EmailStr
    password: str

class RegisterSchema(BaseModel):
    username: str
    email: EmailStr
    password: str

@router.post("/login")
async def login_email(data: LoginSchema, response: Response, session: Session = Depends(get_session)):
    email = data.email
    password = data.password

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email et mot de passe requis")

    # 1. Chercher l'utilisateur par son email de compte MyStats
    statement = select(User).where(User.email == email)
    user = session.exec(statement).first()

    # 2. Vérification de l'utilisateur et du mot de passe
    if not user or not user.password_hash:
        # Note : user.password_hash peut être None si l'user s'est inscrit via Spotify uniquement
        raise HTTPException(status_code=401, detail="Identifiants incorrects")
    if not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Identifiants incorrects")

    # 3. Génération d'un nouvel ID de session (UUID)
    new_session_id = create_uuid_session()
    user.session_id = new_session_id
    session.add(user)
    session.commit()
    session.refresh(user)

    # 4. On crée explicitement la réponse JSON
    content = {
        "status": "success",
        "user_name": user.display_name,
        "has_spotify": user.spotify_id is not None
    }
    response = JSONResponse(content=content)

    # 5. On pose le cookie sur cette réponse précise
    response.set_cookie(
        key="session_id",
        value=new_session_id,
        httponly=True,
        samesite="none" if IS_PRODUCTION else "lax",
        secure=IS_PRODUCTION,
        max_age=3600 * 24 * 30,
        path="/"
    )

    return response

@router.post("/register")
async def register(data: RegisterSchema, session: Session = Depends(get_session)):
    # 1. Vérifier si l'utilisateur existe déjà
    statement = select(User).where(User.email == data.email)
    existing_user = session.exec(statement).first()
    if existing_user:
        raise HTTPException(
            status_code=400, 
            detail="Un compte avec cet email existe déjà."
        )

    # 2. Hacher le mot de passe
    hashed_password = get_password_hash(data.password)

    # 3. Créer le nouvel utilisateur
    # On laisse les champs Spotify à None par défaut
    new_user = User(
        email=data.email,
        password_hash=hashed_password,
        display_name=data.username,
        session_id=None,
        spotify_id=None,
        refresh_token=None,
        access_token=None
    )

    try:
        session.add(new_user)
        session.commit()
        session.refresh(new_user)
        
        return {
            "status": "success",
            "message": "Utilisateur créé avec succès",
            "user_id": new_user.id
        }
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail="Erreur lors de la création du compte.")

@router.get("/logout")
async def logout():
    response = RedirectResponse(url=FRONTEND_URL)
    response.delete_cookie(key="session_id", path="/")
    return response

@router.get("/me")
async def get_me(session_id: Optional[str] = Cookie(None), db: Session = Depends(get_session)):
    if not session_id: return {"is_logged_in": False}
    # On cherche l'utilisateur qui possède ce session_id précis
    statement = select(User).where(User.session_id == session_id)
    user = db.exec(statement).first()
    if not user: return {"is_logged_in": False}
    
    return {
        "is_logged_in": True,
        "user_name": user.display_name,
        "has_spotify": user.spotify_id != None
    }

@router.patch("/update")
async def update_profile(
    data: UpdateProfileSchema, 
    session_id: Optional[str] = Cookie(None), 
    session: Session = Depends(get_session)
):
    # 1. Vérifier la session
    if not session_id: raise HTTPException(status_code=401, detail="Non authentifié")
    # 2. Trouver l'utilisateur
    statement = select(User).where(User.session_id == session_id)
    user = session.exec(statement).first()
    if not user: raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    # 3. Mettre à jour les champs fournis
    if data.username:
        user.display_name = data.username

    # 4. Sauvegarder
    session.add(user)
    session.commit()
    session.refresh(user)

    return {
        "status": "success", 
        "message": "Profil mis à jour",
        "user_name": user.display_name
    }