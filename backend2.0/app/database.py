# Conexão com o banco de dados.

import os
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.engine import URL
from sqlalchemy.orm import sessionmaker, declarative_base

if os.getenv("DB_USER"):
  
    DATABASE_URL = URL.create(
        "mysql+pymysql",
        username=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD", ""),
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "3306")),
        database=os.getenv("DB_NAME", "meli_ta"),
        query={"charset": "utf8mb4"},
    )
   
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
else:
    _arquivo = Path(__file__).resolve().parent.parent / "meli_ta.db"
    DATABASE_URL = f"sqlite:///{_arquivo.as_posix()}"
  
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

    @event.listens_for(engine, "connect")
    def _ativa_chaves_estrangeiras(conexao, _registro):
      
        cursor = conexao.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(bind=engine, autoflush=False)
Base = declarative_base()


def get_db():
    """Dependência do FastAPI: abre uma sessão por requisição e fecha no final."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
