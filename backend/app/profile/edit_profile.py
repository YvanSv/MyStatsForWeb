import re
from fastapi import APIRouter, Cookie, HTTPException, Depends
from sqlmodel import Session, select
from app.database import get_session
from app.models import User
from pydantic import BaseModel, field_validator
from typing import Dict, Optional
from app.response_message import UserSettingsResponse, UserUpdateResponse

RESERVED_SLUGS = ["admin", "settings", "dashboard", "api", "auth", "login"]

class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    slug: Optional[str] = None
    avatar_url: Optional[str] = None
    banner_url: Optional[str] = None
    perms: Optional[Dict[str, bool]] = None

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, v: str):
        if v is None: return v
        if len(v) > 30: raise ValueError("Le slug ne doit pas dépasser 30 caractères.")
        if not re.match(r"^[a-z0-9-]+$", v): raise ValueError("Le slug ne peut contenir que des minuscules, chiffres et tirets.")
        if v.isdigit(): raise ValueError("Le slug ne peut pas être composé uniquement de chiffres.")
        if v.lower() in RESERVED_SLUGS: raise ValueError("Ce nom d'utilisateur est réservé.")
        return v.lower()

def verify_owner(slug: str, session_id: str, db: Session):
    if not session_id: raise HTTPException(status_code=401, detail="Non connecté")
    # On cherche l'utilisateur qui possède ce session_id
    current_user = db.exec(select(User).where(User.session_id == session_id)).first()

    if slug.isdigit(): current_user = db.get(User, int(slug))
    else: current_user = db.exec(select(User).where(User.slug == slug)).first()
    if not current_user: raise HTTPException(status_code=404, detail="Profil introuvable")
    if not current_user or current_user.id != current_user.id: raise HTTPException(status_code=403, detail="Action non autorisée sur ce profil")
    return current_user

router = APIRouter()

@router.patch(
    "/{slug}",
    summary="Mettre à jour le profil utilisateur",
    response_model=UserUpdateResponse,
    responses={
        200: {"description": "Profil mis à jour avec succès."},
        400: {"description": "Slug déjà utilisé ou données invalides."},
        401: {"description": "Non connecté."},
        402: {"description": "Nom d'affichage trop long."},
        403: {"description": "Action non autorisée sur ce profil."},
        404: {"description": "Profil introuvable."}
    }
)
def update_user_profile(
    slug: str, 
    user_data: UserUpdate,
    session_id: Optional[str] = Cookie(None),
    session: Session = Depends(get_session)
):
    """
    Permet de modifier les détails du profil (bio, avatar, bannières) et les permissions.
    
    **Processus :**
    1. Identification de l'utilisateur via le cookie de session.
    2. Correspondance avec le slug demandé.
    3. Application des modifications uniquement sur les champs fournis.
    """
    db_user = verify_owner(slug, session_id, session)
    update_data = user_data.model_dump(exclude_unset=True)

    if "slug" in update_data and update_data["slug"] != db_user.slug:
        is_taken = session.exec(select(User.id).where(User.slug == update_data["slug"])).first()
        if is_taken: raise HTTPException(status_code=400, detail="Cet url personnalisé est déjà pris.")
    if "display_name" in update_data and len(update_data["display_name"]) > 20:
        raise HTTPException(status_code=402, detail="Nom d'affichage trop long.")

    for key, value in update_data.items():
        if key == "perms" and isinstance(value, dict):
            current_perms = getattr(db_user, "perms") or {}
            setattr(db_user, "perms", {**current_perms, **value})
        else: setattr(db_user, key, value)
    session.add(db_user)
    session.commit()
    session.refresh(db_user)

    return {
        "status": "success",
        "message": "Profil mis à jour avec succès",
        "user": {
            "display_name": db_user.display_name,
            "bio": db_user.bio,
            "slug": db_user.slug,
            "avatar_url": db_user.avatar_url,
            "banner_url": db_user.banner_url,
            "perms": db_user.perms
        }
    }

@router.get("/{slug}", response_model=UserSettingsResponse)
def get_user_settings(
    slug: str,
    session_id: Optional[str] = Cookie(None),
    session: Session = Depends(get_session)
):
    """
    Récupère l'intégralité des informations de compte pour l'édition.

    **Sécurité stricte :**
    Contrairement à une route de profil publique, cette route utilise la fonction `verify_owner`. 
    Elle compare le `session_id` stocké dans les cookies avec le propriétaire du `slug` demandé. 
    Si les deux ne correspondent pas, une erreur **403 Forbidden** est renvoyée.

    **Champs sensibles :**
    Cette route expose l'objet `perms`, qui contient les réglages de confidentialité (ex: `dashboard: private/public`) que seul l'utilisateur doit pouvoir consulter et modifier.
    """
    return verify_owner(slug, session_id, session)