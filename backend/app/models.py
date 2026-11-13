# Tabelas do banco (SQLAlchemy)
from sqlalchemy import Column, Integer, String, Date, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base


class Parceiro(Base):
    __tablename__ = "parceiros"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(120), nullable=False, unique=True)
    tipo = Column(String(50))  # ex: instituição de ensino, empresa, ongs
    regiao = Column(String(80))


class Evento(Base):
    __tablename__ = "eventos"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(120), nullable=False)
    data = Column(Date, nullable=False)
    local = Column(String(200))
    regiao = Column(String(80)) 
    vagas = Column(Integer, default=0)
    status = Column(String(30), default="planejado")  # planejado, realizado, cancelado
    responsavel = Column(String(80))
    parceiro_id = Column(Integer, ForeignKey("parceiros.id"), nullable=True)

    parceiro = relationship("Parceiro")
    leads = relationship("Lead", back_populates="evento")


class Lead(Base):
    __tablename__ = "leads"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(120), nullable=False)
    email = Column(String(120))
    evento_id = Column(Integer, ForeignKey("eventos.id"), nullable=False)

    evento = relationship("Evento", back_populates="leads")
