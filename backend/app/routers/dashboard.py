# Indicadores e cobertura por região (base pros dashboards).
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from .. import models
from ..database import get_db
from ..auth import perfil_atual

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/indicadores")
def indicadores(db: Session = Depends(get_db), _=Depends(perfil_atual)):
    return {
        "eventos_total": db.query(models.Evento).count(),
        "eventos_realizados": db.query(models.Evento).filter_by(status="realizado").count(),
        "leads_total": db.query(models.Lead).count(),
        "parceiros_total": db.query(models.Parceiro).count(),
    }


@router.get("/cobertura")
def cobertura(db: Session = Depends(get_db), _=Depends(perfil_atual)):
    """Quantidade de eventos por região: muitas = saturada, poucas = potencial."""
    linhas = (db.query(models.Evento.regiao, func.count(models.Evento.id))
              .group_by(models.Evento.regiao).all())
    return [{"regiao": r or "sem região", "eventos": n} for r, n in linhas]
