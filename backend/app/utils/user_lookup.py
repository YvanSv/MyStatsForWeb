from fastapi import HTTPException
from sqlmodel import Session, select
from app.models import User

def get_user_by_slug_or_404(session: Session, slug: str, detail: str = "Profil introuvable") -> User:
    """Résout un profil par identifiant numérique ou par slug ; 404 avec le message `detail` si absent."""
    if slug.isdigit(): user = session.get(User, int(slug))
    else: user = session.exec(select(User).where(User.slug == slug)).first()
    if not user: raise HTTPException(status_code=404, detail=detail)
    return user
