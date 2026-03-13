from fastapi import APIRouter, Cookie, HTTPException, Depends
from sqlmodel import Session, select
from app.database import get_session
from app.models import User
from pydantic import BaseModel
from typing import Dict, Optional

class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    banner_url: Optional[str] = None
    perms: Optional[Dict[str, bool]] = None

def verify_owner(user_id: int, session_id: str, db: Session):
    if not session_id: raise HTTPException(status_code=401, detail="Non connecté")

    # On cherche l'utilisateur qui possède ce session_id
    current_user = db.exec(select(User).where(User.session_id == session_id)).first()
    
    if not current_user or current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Action non autorisée sur ce profil")
    
    return current_user

router = APIRouter()

@router.patch("/{user_id}")
def update_user_profile(
    user_id: int, 
    user_data: UserUpdate,
    session_id: Optional[str] = Cookie(None),
    session: Session = Depends(get_session)
):
    db_user = verify_owner(user_id, session_id, session)

    update_data = user_data.model_dump(exclude_unset=True)
    for key, value in update_data.items(): setattr(db_user, key, value)
    session.add(db_user)
    session.commit()
    session.refresh(db_user)

    return {
        "status": "success",
        "message": "Profil mis à jour avec succès",
        "user": {
            "display_name": db_user.display_name,
            "bio": db_user.bio,
            "avatar_url": db_user.avatar_url,
            "banner_url": db_user.banner_url,
            "perms": db_user.perms
        }
    }

@router.get("/{user_id}")
def get_user_settings(
    user_id: int,
    session_id: Optional[str] = Cookie(None),
    session: Session = Depends(get_session)
):
    db_user = verify_owner(user_id, session_id, session)
    return {
        "display_name": db_user.display_name,
        "bio": db_user.bio,
        "avatar_url": db_user.avatar_url,
        "banner_url": db_user.banner_url,
        "perms": db_user.perms
    }