from fastapi import APIRouter
from .dashboard_data import router as dashboard_data_router

router = APIRouter()
router.include_router(dashboard_data_router, prefix="/dashboard")