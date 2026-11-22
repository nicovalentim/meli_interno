from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..auth import exige_perfil

router = APIRouter(prefix="/leads", tags=["Leads"])

# Dados de candidatos são sensíveis: só admin acessa.
PODEM_VER_LEADS = ("admin",)


@router.post("", response_model=schemas.LeadOut, status_code=201)
@router.post("/", response_model=schemas.LeadOut, status_code=201, include_in_schema=False)
def criar(dados: schemas.LeadIn, db: Session = Depends(get_db),
          _=Depends(exige_perfil(*PODEM_VER_LEADS))):
    if not db.get(models.Evento, dados.evento_id):
        raise HTTPException(404, "Evento não existe")
    lead = models.Lead(**dados.model_dump())
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


@router.get("", response_model=list[schemas.LeadOut])
@router.get("/", response_model=list[schemas.LeadOut], include_in_schema=False)
def listar(evento_id: Optional[int] = None,
           limit: int = Query(100, ge=1, le=500), offset: int = Query(0, ge=0),
           db: Session = Depends(get_db), _=Depends(exige_perfil(*PODEM_VER_LEADS))):
    q = db.query(models.Lead)
    if evento_id is not None:
        q = q.filter(models.Lead.evento_id == evento_id)
    return q.order_by(models.Lead.id).offset(offset).limit(limit).all()

# verificar
@router.get("/", response_model=list[schemas.LeadOut])
def listar(evento_id: Optional[int] = None, db: Session = Depends(get_db),
           _=Depends(exige_perfil(*PODEM_VER_LEADS))):
    q = db.query(models.Lead)
    if evento_id is not None:
        q = q.filter(models.Lead.evento_id == evento_id)
    return q.order_by(models.Lead.id).all()


@router.delete("/{lead_id}", status_code=204)
def deletar(lead_id: int, db: Session = Depends(get_db),
            _=Depends(exige_perfil(*PODEM_VER_LEADS))):
    # Necessário para conseguir excluir um evento que já tem leads.
    lead = db.get(models.Lead, lead_id)
    if not lead:
        raise HTTPException(404, "Lead não encontrado")
    db.delete(lead)
    db.commit()
