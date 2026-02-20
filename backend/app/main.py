from fastapi import FastAPI
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from app.database import create_db_and_tables
from app.auth import router as auth_router
from app.api.spotify import router as spotify_router
from app.api.stats.overview import router as overview_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

app = FastAPI(title="MyStats Spotify API",lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:3001","http://localhost:3001","http://localhost:3000","http://127.0.0.1:3000","https://mystats-for-web.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(spotify_router)
app.include_router(overview_router)

@app.get("/")
def read_root():
    return {"status": "online", "message": "API MyStatsWeb opérationnelle"}