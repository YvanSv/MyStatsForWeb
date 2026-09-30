from fastapi import APIRouter
from .status import router as status_router

router = APIRouter(prefix="/spotify", tags=["Status"])
router.include_router(status_router, prefix="/status")