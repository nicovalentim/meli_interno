from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..auth import perfil_atual, exige_perfil

router = APIRouter(prefix="/parceiros", tags=["Parceiros"])


@router.post("", response_model=schemas.ParceiroOut, status_code=201)
@router.post("/", response_model=schemas.ParceiroOut, status_code=201, include_in_schema=False)
def criar(dados: schemas.ParceiroIn, db: Session = Depends(get_db),
          _=Depends(exige_perfil("admin"))):
    if db.query(models.Parceiro).filter_by(nome=dados.nome).first():
        raise HTTPException(409, "Parceiro já cadastrado")  # evita duplicidade
    parceiro = models.Parceiro(**dados.model_dump())
    db.add(parceiro)
    db.commit()
    db.refresh(parceiro)
    return parceiro


@router.get("", response_model=list[schemas.ParceiroOut])
@router.get("/", response_model=list[schemas.ParceiroOut], include_in_schema=False)
def listar(limit: int = Query(100, ge=1, le=500), offset: int = Query(0, ge=0),
           db: Session = Depends(get_db), _=Depends(perfil_atual)):
    return db.query(models.Parceiro).order_by(models.Parceiro.nome).offset(offset).limit(limit).all()
