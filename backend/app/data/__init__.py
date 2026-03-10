from fastapi import APIRouter
from .overview import router as overview_router

router = APIRouter(prefix="/data", tags=["Overview"])
router.include_router(overview_router, prefix="/overview")