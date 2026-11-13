
from datetime import date
from typing import Optional
from pydantic import BaseModel, ConfigDict


class ParceiroIn(BaseModel):
    nome: str
    tipo: Optional[str] = None
    regiao: Optional[str] = None


class ParceiroOut(ParceiroIn):
    model_config = ConfigDict(from_attributes=True)
    id: int


class EventoIn(BaseModel):
    nome: str
    data: date
    local: Optional[str] = None
    regiao: Optional[str] = None
    vagas: int = 0
    status: str = "planejado"
    responsavel: Optional[str] = None
    parceiro_id: Optional[int] = None


class EventoOut(EventoIn):
    model_config = ConfigDict(from_attributes=True)
    id: int


class LeadIn(BaseModel):
    nome: str
    email: Optional[str] = None
    evento_id: int


class LeadOut(LeadIn):
    model_config = ConfigDict(from_attributes=True)
    id: int