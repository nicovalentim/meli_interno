from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..auth import perfil_atual, exige_perfil

router = APIRouter(prefix="/eventos", tags=["Eventos"])

SO_ADMIN = exige_perfil("admin")


def _acha_evento(db: Session, evento_id: int):
    evento = db.get(models.Evento, evento_id)
    if not evento:
        raise HTTPException(404, "Evento não encontrado")
    return evento


def _confere_parceiro(db: Session, parceiro_id: Optional[int]):
   
    if parceiro_id is not None and not db.get(models.Parceiro, parceiro_id):
        raise HTTPException(404, "Parceiro não existe")



@router.post("", response_model=schemas.EventoOut, status_code=201)
@router.post("/", response_model=schemas.EventoOut, status_code=201, include_in_schema=False)
def criar(dados: schemas.EventoIn, db: Session = Depends(get_db), _=Depends(SO_ADMIN)):
    # Cadastra UMA vez; todas as áreas enxergam via GET.
    _confere_parceiro(db, dados.parceiro_id)
    evento = models.Evento(**dados.model_dump())
    db.add(evento)
    db.commit()
    db.refresh(evento)
    return evento


@router.get("", response_model=list[schemas.EventoOut])
@router.get("/", response_model=list[schemas.EventoOut], include_in_schema=False)
def listar(regiao: Optional[str] = None,
           status: Optional[schemas.StatusEvento] = None,
           parceiro_id: Optional[int] = None,
           limit: int = Query(100, ge=1, le=500),
           offset: int = Query(0, ge=0),
           db: Session = Depends(get_db), _=Depends(perfil_atual)):
    q = db.query(models.Evento)
    if regiao:
        q = q.filter(models.Evento.regiao == regiao)
    if status:
        q = q.filter(models.Evento.status == status)
    if parceiro_id is not None:
        q = q.filter(models.Evento.parceiro_id == parceiro_id)
    return q.order_by(models.Evento.data, models.Evento.id).offset(offset).limit(limit).all()


@router.get("/{evento_id}", response_model=schemas.EventoOut)
def buscar(evento_id: int, db: Session = Depends(get_db), _=Depends(perfil_atual)):
    return _acha_evento(db, evento_id)


@router.put("/{evento_id}", response_model=schemas.EventoOut)
def atualizar(evento_id: int, dados: schemas.EventoIn, db: Session = Depends(get_db), _=Depends(SO_ADMIN)):
    # PUT troca o evento inteiro: campos que não forem enviados voltam ao valor padrão.
    # Para mudar só alguns campos, use PATCH.
    evento = _acha_evento(db, evento_id)
    _confere_parceiro(db, dados.parceiro_id)
    for campo, valor in dados.model_dump().items():
        setattr(evento, campo, valor)
    db.commit()
    db.refresh(evento)
    return evento


@router.patch("/{evento_id}", response_model=schemas.EventoOut)
def editar(evento_id: int, dados: schemas.EventoPatch, db: Session = Depends(get_db), _=Depends(SO_ADMIN)):
    evento = _acha_evento(db, evento_id)
    campos = dados.model_dump(exclude_unset=True)  # só o que foi enviado
    _confere_parceiro(db, campos.get("parceiro_id"))
    for campo, valor in campos.items():
        setattr(evento, campo, valor)
    db.commit()
    db.refresh(evento)
    return evento


@router.delete("/{evento_id}", status_code=204)
def deletar(evento_id: int, db: Session = Depends(get_db), _=Depends(SO_ADMIN)):
    evento = _acha_evento(db, evento_id)
    if db.query(models.Lead).filter_by(evento_id=evento_id).first():
        raise HTTPException(409, "Este evento tem leads cadastrados e não pode ser apagado. "
                                 "Mude o status para 'cancelado'.")
    db.delete(evento)
    db.commit()
