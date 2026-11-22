# Schemas (Pydantic)
from datetime import date
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator

StatusEvento = Literal["planejado", "realizado", "cancelado"]


PADRAO_EMAIL = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


class Entrada(BaseModel):
    """Base dos dados que chegam na API: remove espaços no começo e no fim dos textos."""
    model_config = ConfigDict(str_strip_whitespace=True)


# ---------- Parceiros ----------
class ParceiroIn(Entrada):
    nome: str = Field(min_length=1, max_length=120)
    tipo: Optional[str] = Field(None, max_length=50)
    regiao: Optional[str] = Field(None, max_length=80)
    imagem: Optional[str] = Field(None, max_length=300)


class ParceiroOut(ParceiroIn):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ---------- Eventos ----------
class EventoIn(Entrada):
    nome: str = Field(min_length=1, max_length=120)
    data: date
    local: Optional[str] = Field(None, max_length=200)
    regiao: Optional[str] = Field(None, max_length=80)
    vagas: int = Field(0, ge=0)
    status: StatusEvento = "planejado"
    responsavel: Optional[str] = Field(None, max_length=80)
    parceiro_id: Optional[int] = Field(None, gt=0)
    imagem: Optional[str] = Field(None, max_length=300)


class EventoPatch(Entrada):
    """Edição parcial: só os campos enviados são alterados."""
    nome: Optional[str] = Field(None, min_length=1, max_length=120)
    data: Optional[date] = None
    local: Optional[str] = Field(None, max_length=200)
    regiao: Optional[str] = Field(None, max_length=80)
    vagas: Optional[int] = Field(None, ge=0)
    status: Optional[StatusEvento] = None
    responsavel: Optional[str] = Field(None, max_length=80)
    parceiro_id: Optional[int] = Field(None, gt=0)
    imagem: Optional[str] = Field(None, max_length=300)

    @field_validator("nome", "data", "vagas", "status")
    @classmethod
    def nao_pode_ser_nulo(cls, valor):
       
        if valor is None:
            raise ValueError("não pode ser nulo")
        return valor


class EventoOut(EventoIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    status: str 


# ---------- Leads ----------
class LeadIn(Entrada):
    nome: str = Field(min_length=1, max_length=120)
    email: Optional[str] = Field(None, max_length=120, pattern=PADRAO_EMAIL)
    evento_id: int = Field(gt=0)
    imagem: Optional[str] = Field(None, max_length=300)

    @field_validator("email", mode="before")
    @classmethod
    def email_vazio_vira_nulo(cls, valor):
        
        if isinstance(valor, str) and not valor.strip():
            return None
        return valor


class LeadOut(LeadIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: Optional[str] = None  

# NOVO
# ---------- Login ----------
class LoginIn(Entrada):
    email: str = Field(max_length=120, pattern=PADRAO_EMAIL)
    senha: str = Field(min_length=6, max_length=128)

    @field_validator("email")
    @classmethod
    def email_minusculo(cls, valor):
        return valor.lower()


class LoginOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    perfil: Literal["admin", "user"]
    nome: str
    email: str
    imagem: Optional[str] = None
