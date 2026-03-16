from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, delete
from app.database import get_session
from app.models import User, TrackHistory
from app.auth.utils.auth_utils import get_current_user_id

router = APIRouter()

@router.delete("")
async def clear_user_data(db: Session = Depends(get_session),user_id: int = Depends(get_current_user_id)):
    """
    Réinitialise le profil de l'utilisateur et supprime tout son historique d'écoute.
    """
    user = db.get(User, user_id)
    if not user: raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    try:
        # Supprimer l'historique d'écoute
        statement = delete(TrackHistory).where(TrackHistory.user_id == user_id)
        db.exec(statement)

        # Réinitialiser les champs du profil
        user.perms = {
            "profile": True,
            "stats": True,
            "favorites": True,
            "history": True,
            "dashboard": True
        }
        user.banner_url = None
        user.avatar_url = None
        user.bio = None
        user.slug = None
        
        db.add(user)
        db.commit()
        return {"message": "Historique supprimé et profil réinitialisé avec succès."}

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la réinitialisation : {str(e)}"
        )