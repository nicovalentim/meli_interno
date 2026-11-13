from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..auth import perfil_atual, exige_perfil

router = APIRouter(prefix="/eventos", tags=["Eventos"])


@router.post("/", response_model=schemas.EventoOut, status_code=201)
def criar(dados: schemas.EventoIn, db: Session = Depends(get_db),
          _=Depends(exige_perfil("talent_attraction"))):
    # Cadastra UMA vez; todas as áreas enxergam via GET.
    evento = models.Evento(**dados.model_dump())
    db.add(evento)
    db.commit()
    db.refresh(evento)
    return evento


@router.get("/", response_model=list[schemas.EventoOut])
def listar(regiao: Optional[str] = None, status: Optional[str] = None,
           parceiro_id: Optional[int] = None,
           db: Session = Depends(get_db), _=Depends(perfil_atual)):
    q = db.query(models.Evento)
    if regiao:
        q = q.filter(models.Evento.regiao == regiao)
    if status:
        q = q.filter(models.Evento.status == status)
    if parceiro_id:
        q = q.filter(models.Evento.parceiro_id == parceiro_id)
    return q.all()


@router.get("/{evento_id}", response_model=schemas.EventoOut)
def buscar(evento_id: int, db: Session = Depends(get_db), _=Depends(perfil_atual)):
    evento = db.get(models.Evento, evento_id)
    if not evento:
        raise HTTPException(404, "Evento não encontrado")
    return evento


@router.put("/{evento_id}", response_model=schemas.EventoOut)
def atualizar(evento_id: int, dados: schemas.EventoIn, db: Session = Depends(get_db),
              _=Depends(exige_perfil("talent_attraction"))):
    evento = db.get(models.Evento, evento_id)
    if not evento:
        raise HTTPException(404, "Evento não encontrado")
    for campo, valor in dados.model_dump().items():
        setattr(evento, campo, valor)
    db.commit()
    db.refresh(evento)
    return evento


@router.delete("/{evento_id}", status_code=204)
def deletar(evento_id: int, db: Session = Depends(get_db),
            _=Depends(exige_perfil("talent_attraction"))):
    evento = db.get(models.Evento, evento_id)
    if not evento:
        raise HTTPException(404, "Evento não encontrado")
    db.delete(evento)
    db.commit()
