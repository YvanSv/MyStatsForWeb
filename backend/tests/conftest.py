import itertools
import os
import sys
from pathlib import Path

# Base 100 % locale : posé AVANT tout import de l'app (python-dotenv n'écrase pas une variable déjà définie)
os.environ["DATABASE_URL"] = "sqlite://"
os.environ.pop("RENDER", None)
os.environ.pop("ENV", None)
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from app.database import get_session
from app.main import app
from app.models import User


@pytest.fixture
def engine():
    eng = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    SQLModel.metadata.create_all(eng)  # les modèles sont compatibles SQLite (JSON, Text, enums)
    yield eng
    eng.dispose()


@pytest.fixture
def db(engine):
    with Session(engine) as s:
        yield s


@pytest.fixture
def client(engine):
    def _get_session():
        with Session(engine) as s:
            yield s

    app.dependency_overrides[get_session] = _get_session
    # Pas de `with` : le lifespan (create_db_and_tables sur la vraie base) n'est jamais exécuté
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def make_user(db):
    counter = itertools.count()

    def _make(**kw):
        kw.setdefault("email", f"u{next(counter)}@test.fr")
        kw.setdefault("display_name", "Bob")
        u = User(**kw)
        db.add(u)
        db.commit()
        db.refresh(u)
        return u
    return _make
