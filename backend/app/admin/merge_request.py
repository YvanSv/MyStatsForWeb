from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import List, Optional
from app.database import get_session 
from app.models import MergeRequest, MergeEntityType, MergeStatus

router = APIRouter(prefix="/merge-requests")

@router.get("", response_model=List[MergeRequest])
def get_merge_requests(
    *,
    session: Session = Depends(get_session),
    status: Optional[MergeStatus] = Query(None, description="Filtrer par statut (PENDING, COMPLETED, etc.)"),
    entity_type: Optional[MergeEntityType] = Query(None, description="Filtrer par type (ARTIST, ALBUM, TRACK)"),
    offset: int = 0,
    limit: int = Query(default=100, lte=100)
):
    """
    Récupère la liste des Merge Requests avec filtres optionnels.
    """
    # 1. Construction de la requête de base
    statement = select(MergeRequest)
    
    # 2. Application des filtres dynamiques
    if status: statement = statement.where(MergeRequest.status == status)
    if entity_type: statement = statement.where(MergeRequest.entity_type == entity_type)
    
    # 3. Tri par date de création (les plus récentes en premier) et pagination
    statement = statement.order_by(MergeRequest.created_at.desc()).offset(offset).limit(limit)
    
    # 4. Exécution
    results = session.exec(statement).all()
    
    return results

@router.get("/{mr_id}", response_model=MergeRequest)
def get_merge_request_by_id(
    mr_id: int, 
    session: Session = Depends(get_session)
):
    """
    Récupère les détails d'une Merge Request spécifique par son ID.
    """
    mr = session.get(MergeRequest, mr_id)
    if not mr:
        raise HTTPException(status_code=404, detail="Merge Request non trouvée")
    return mr