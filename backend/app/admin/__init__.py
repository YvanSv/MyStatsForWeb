from .admin_page import router as admin_router
from .merge_request import router as mr_router
from .create_request import router as cr_router
from fastapi import Depends, HTTPException, status, APIRouter
from app.auth.utils.auth_utils import get_current_user
from app.models import User

def restrict_to_admin(current_user: User = Depends(get_current_user)):
    if not current_user.isadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès refusé : privilèges administrateur requis."
        )
    return current_user

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(restrict_to_admin)])
router.include_router(admin_router)
router.include_router(mr_router)
router.include_router(cr_router)