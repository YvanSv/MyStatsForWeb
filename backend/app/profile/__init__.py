from fastapi import APIRouter
from .profile_data import router as profile_router
from .dashboard import router as dashboard_router
from .edit_profile import router as edit_profile_router

router = APIRouter(tags=["Profile data"])
router.include_router(profile_router, prefix="/profile")
router.include_router(dashboard_router, prefix="/profile")
router.include_router(edit_profile_router, prefix="/edit-profile")