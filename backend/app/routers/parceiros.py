from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..auth import perfil_atual, exige_perfil

router = APIRouter(prefix="/parceiros", tags=["Parceiros"])


@router.post("/", response_model=schemas.ParceiroOut, status_code=201)
def criar(dados: schemas.ParceiroIn, db: Session = Depends(get_db),
          _=Depends(exige_perfil("talent_attraction", "taops"))):
    if db.query(models.Parceiro).filter_by(nome=dados.nome).first():
        raise HTTPException(409, "Parceiro já cadastrado")  # evita duplicidade
    parceiro = models.Parceiro(**dados.model_dump())
    db.add(parceiro)
    db.commit()
    db.refresh(parceiro)
    return parceiro


@router.get("/", response_model=list[schemas.ParceiroOut])
def listar(db: Session = Depends(get_db), _=Depends(perfil_atual)):
    return db.query(models.Parceiro).all()
