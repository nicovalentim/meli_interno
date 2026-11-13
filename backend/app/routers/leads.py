from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..auth import exige_perfil

router = APIRouter(prefix="/leads", tags=["Leads"])

# Dados de candidatos são sensíveis.
PODEM_VER_LEADS = ("talent_attraction", "taops")


@router.post("/", response_model=schemas.LeadOut, status_code=201)
def criar(dados: schemas.LeadIn, db: Session = Depends(get_db),
          _=Depends(exige_perfil(*PODEM_VER_LEADS))):
    if not db.get(models.Evento, dados.evento_id):
        raise HTTPException(404, "Evento não existe")
    lead = models.Lead(**dados.model_dump())
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


@router.get("/", response_model=list[schemas.LeadOut])
def listar(db: Session = Depends(get_db), _=Depends(exige_perfil(*PODEM_VER_LEADS))):
    return db.query(models.Lead).all()
