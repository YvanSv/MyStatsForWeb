from sqlmodel import SQLModel, Session, create_engine
import os

# On importe les modèles pour que SQLModel sache qu'ils existent
from app.models import User, Track, PlayHistory 

DATABASE_URL = "postgresql://yvan:password123@localhost:5432/mystatsdb"

engine = create_engine(DATABASE_URL, echo=True)

def create_db_and_tables():
    # SQLModel regarde maintenant dans son registre et y trouve User, Track, etc.
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session