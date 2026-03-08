from fastapi import APIRouter
from .profile_data import router as profile_router
from .dashboard import router as dashboard_router

router = APIRouter(tags=["Profile data"])
router.include_router(profile_router, prefix="/profile", tags=["Profile data"])
router.include_router(dashboard_router, prefix="/profile", tags=["Dashboard data"])