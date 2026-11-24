# Tabelas do banco (SQLAlchemy).
from sqlalchemy import Column, Integer, String, Date, ForeignKey, Text
from sqlalchemy.orm import relationship
from .database import Base


class Parceiro(Base):
    __tablename__ = "parceiros"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(120), nullable=False, unique=True)
    tipo = Column(String(50))  # ex: instituição de ensino, empresa, ong
    regiao = Column(String(80))
    imagem = Column(String(300))  # URL da imagem (ex: /rsc/imagens/comunidade.png)


class Evento(Base):
    __tablename__ = "eventos"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(120), nullable=False)
    data = Column(Date, nullable=False)
    local = Column(String(200))
    regiao = Column(String(80))   # usado no mapeamento de cobertura
    vagas = Column(Integer, default=0)
    status = Column(String(30), default="planejado")  # planejado, realizado, cancelado
    responsavel = Column(String(80))
    parceiro_id = Column(Integer, ForeignKey("parceiros.id"), nullable=True)
    imagem = Column(String(300))  # URL da imagem

    parceiro = relationship("Parceiro")
    leads = relationship("Lead", back_populates="evento")


class Lead(Base):
    __tablename__ = "leads"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(120), nullable=False)
    email = Column(String(120))
    evento_id = Column(Integer, ForeignKey("eventos.id"), nullable=False)
    imagem = Column(String(300))  # URL da imagem

    evento = relationship("Evento", back_populates="leads")

# ADICIONADO
class Usuario(Base):
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(120), nullable=False)
    email = Column(String(120), nullable=False, unique=True, index=True)
    senha_hash = Column(String(300), nullable=False)
    perfil = Column(String(20), nullable=False)  # "admin" ou "user"
    cargo = Column(String(120))
    imagem = Column(Text)  # data URL base64 ("data:image/jpeg;base64,...")
    eventos_atendidos = Column(Integer, default=0)
    vagas_candidatadas = Column(Integer, default=0)
