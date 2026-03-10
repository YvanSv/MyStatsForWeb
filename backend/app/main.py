from fastapi import FastAPI
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from app.database import create_db_and_tables
from app.auth import router as auth_router
from app.data.my import router as my_data_router
from app.data.everyone import router as all_data_router
from app.scripts import router as scripts_router
from app.spotify import router as status_router
from app.profile import router as profile_router
from app.data import router as overview_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

app = FastAPI(title="MyStats Spotify API",lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:3001","http://localhost:3001","http://localhost:3000","http://127.0.0.1:3000","https://mystatsfy.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(my_data_router)
app.include_router(all_data_router)
app.include_router(scripts_router)
app.include_router(status_router)
app.include_router(profile_router)
app.include_router(overview_router)

@app.get("/")
def read_root():
    return {"status": "online", "message": "API MyStatsWeb opérationnelle"}