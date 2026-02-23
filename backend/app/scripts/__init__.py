from fastapi import APIRouter

from .maintenance import router as maintenance_router
router = APIRouter(prefix="/fix-missing-covers", tags=["Maintenance"])
router.include_router(maintenance_router, prefix="/albums", tags=["Maintenance"])