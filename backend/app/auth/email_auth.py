import os
from typing import Dict, Optional
from dotenv import load_dotenv
from fastapi import APIRouter, Body, Cookie, Depends, HTTPException, Response
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlmodel import Session, select
from app.database import get_session
from app.models import MusicProvider, User
from .utils.auth_utils import IS_PRODUCTION, create_uuid_session, get_password_hash, set_session_cookie, verify_password
from app.utils.profile_defaults import default_avatar
from app.response_message import BaseResponse, MessageResponse

load_dotenv()
FRONTEND_URL = os.getenv("FRONTEND_URL")
router = APIRouter(prefix="/auth")

class LoginSchema(BaseModel):
    email: EmailStr
    password: str

class RegisterSchema(BaseModel):
    username: str = Field(..., min_length=3, max_length=30)
    email: EmailStr
    password: str = Field(..., min_length=8)

class DetailMessage(BaseModel):
    detail: str

class LoginSuccessResponse(BaseResponse):
    user_id: int

class RegisterSuccessResponse(MessageResponse):
    user_id: int

class LogoutResponse(MessageResponse):
    message: str = "Déconnexion réussie"

class ProviderInfo(BaseModel):
    has: bool
    email: Optional[str] = None

class UserMeResponse(BaseModel):
    id: int
    slug: Optional[str]
    user_name: str
    email: Optional[str]
    is_logged_in: bool
    isAdmin: bool
    avatar : str
    providers: Dict[str, ProviderInfo]

class UpdateSuccessResponse(MessageResponse):
    message: str = "Profil mis à jour"
    user_name: str
    email: str

class UpdateProfileSchema(BaseModel):
    username: str | None = None
    password: str | None = None
    email: str | None = None

    @field_validator('username')
    @classmethod
    def validate_username(cls, v):
        if v is not None:
            v = v.strip()
            if not (3 <= len(v) <= 20):
                raise ValueError("Le nom d'utilisateur doit faire entre 3 et 20 caractères")
        return v

    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if v is not None:
            v = v.strip()
            if not (8 <= len(v) <= 128):
                raise ValueError("Le mot de passe doit faire entre 8 et 128 caractères")
        return v

@router.post("/login", response_model=LoginSuccessResponse)
async def login_email(data: LoginSchema, response: Response, session: Session = Depends(get_session)):
    """
    Authentifie l'utilisateur et initialise une session :
    1. Vérifie si l'utilisateur existe.
    2. Compare le hachage du mot de passe.
    3. Génère un **UUID** de session stocké en base.
    4. Renvoie un cookie **HttpOnly** sécurisé.
    
    *Note : Si l'utilisateur s'est inscrit via Spotify, il doit se connecter via le flux Spotify.*
    """
    statement = select(User).where(User.email == data.email)
    user = session.exec(statement).first()

    # Vérification de l'utilisateur et du mot de passe
    if not user or not user.password_hash or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Identifiants incorrects")

    # Génération d'un nouvel ID de session (UUID)
    new_session_id = create_uuid_session()
    user.session_id = new_session_id
    
    try:
        session.add(user)
        session.commit()
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail="Erreur lors de la création de la session.")

    set_session_cookie(response, new_session_id)

    return LoginSuccessResponse(user_id=user.id)

@router.post(
    "/register",
    summary="Créer un nouveau compte",
    response_model=RegisterSuccessResponse,
    status_code=201
)
async def register(data: RegisterSchema, session: Session = Depends(get_session)):
    """
    Inscrit un nouvel utilisateur dans la base de données :
    - **email**: Identifiant unique pour la connexion.
    - **password**: Sera haché avant le stockage (BCrypt/Argon2).
    - **username**: Nom d'affichage initial sur le profil.
    
    Vérifie d'abord si l'email existe déjà pour éviter les doublons.
    """
    existing_user = session.exec(select(User).where(User.email == data.email)).first()
    if existing_user: raise HTTPException(status_code=400,detail="Un compte avec cet email existe déjà.")

    # Création de l'utilisateur
    new_user = User(
        email=data.email,
        password_hash=get_password_hash(data.password),
        display_name=data.username
    )

    try:
        session.add(new_user)
        session.commit()
        session.refresh(new_user)
        return RegisterSuccessResponse(
            user_id=new_user.id,
            message="Compte créé avec succès"
        )
    except IntegrityError:
        session.rollback()
        raise HTTPException(status_code=400, detail="Ce nom d'utilisateur est déjà pris.")
    except Exception:
        session.rollback()
        raise HTTPException(status_code=500, detail="Erreur lors de la création du compte.")

@router.post("/logout", response_model=LogoutResponse)
async def logout(response: Response,session: Session = Depends(get_session),session_id: Optional[str] = Cookie(None)):
    """
    Supprime la session côté client en invalidant le cookie **session_id**.
    - **Côté Client** : Le navigateur supprimera automatiquement le cookie grâce à l'instruction `Set-Cookie` avec une date d'expiration passée.
    - **Note** : Il est conseillé de rediriger l'utilisateur vers la page d'accueil ou de login après cet appel.
    """
    if session_id:
        statement = select(User).where(User.session_id == session_id)
        user = session.exec(statement).first()
        if user:
            user.session_id = None
            session.add(user)
            session.commit()
    response.delete_cookie(key="session_id",path="/")
    return LogoutResponse()

@router.get(
    "/me",
    summary="Récupérer l'utilisateur actuel",
    response_model=UserMeResponse,
    responses={401: {"model": DetailMessage}}
)
async def get_me(response: Response, session_id: Optional[str] = Cookie(None), db: Session = Depends(get_session)):
    """
    Vérifie la session de l'utilisateur via le cookie :
    - Si le cookie est absent : 401.
    - Si le cookie est présent mais inconnu : 401 + suppression du cookie.
    - Si valide : Renvoie les informations essentielles du profil.
    """
    if not session_id: raise HTTPException(status_code=401, detail="Non connecté")

    user = db.exec(select(User).where(User.session_id == session_id)).first()

    if not user:
        response.delete_cookie(key="session_id", path="/")
        raise HTTPException(status_code=401, detail="Session expirée ou invalide")
    
    user_providers = {
        p.value: ProviderInfo(has=False) for p in MusicProvider if p != MusicProvider.ISRC
    }

    for acc in user.accounts:
        if acc.provider in user_providers:
            user_providers[acc.provider] = ProviderInfo(
                has=True,
                email=acc.provider_email
            )

    return UserMeResponse(
        id=user.id,
        slug=user.slug,
        user_name=user.display_name,
        is_logged_in=True,
        isAdmin=user.isadmin,
        email=user.email,
        avatar=user.avatar_url or default_avatar(user),
        providers=user_providers
    )

@router.patch(
    "/update",
    summary="Mettre à jour le compte utilisateur",
    response_model=UpdateSuccessResponse
)
async def update_account(
    payload: UpdateProfileSchema = Body(...), 
    session_id: Optional[str] = Cookie(None), 
    session: Session = Depends(get_session)
):
    """
    Permet de modifier les informations de compte de l'utilisateur connecté.
    - **username**: Change le nom d'affichage public (display_name).
    """
    if not session_id: raise HTTPException(status_code=401, detail="Non authentifié")
    user = session.exec(select(User).where(User.session_id == session_id)).first()
    if not user: raise HTTPException(status_code=401, detail="Session invalide ou expirée")
    if payload.username: user.display_name = payload.username
    if payload.password: user.password_hash = get_password_hash(payload.password)
    if payload.email: user.email = payload.email

    try:
        session.add(user)
        session.commit()
        return UpdateSuccessResponse(
            status="success",
            message="Profil mis à jour",
            user_name=user.display_name,
            email=user.email
        )
    except Exception as e:
        session.rollback()
        print(f"Erreur update: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la mise à jour du compte")
    
@router.delete(
    "/delete",
    summary="Suppression définitive du compte",
    responses={
        200: {"description": "Compte et données supprimés."},
        401: {"description": "Non authentifié."}
    }
)
async def delete_account(
    response: Response,
    session_id: Optional[str] = Cookie(None), 
    session: Session = Depends(get_session)
):
    """
    Supprime intégralement l'utilisateur et ses données associées.
    """
    if not session_id: raise HTTPException(status_code=401, detail="Non authentifié")
    user = session.exec(select(User).where(User.session_id == session_id)).first()
    if not user: raise HTTPException(status_code=401, detail="Session invalide")

    try:
        # Suppression de l'utilisateur
        session.delete(user)
        session.commit()
        # Nettoyage du cookie côté client
        response.delete_cookie(
            key="session_id",
            path="/",
            samesite="none" if IS_PRODUCTION else "lax",
            secure=IS_PRODUCTION
        )
        return {"status": "success", "message": "Votre compte et toutes vos données ont été supprimés."}
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail="Erreur lors de la suppression du compte.")