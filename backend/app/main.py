# Ligar a api. Rodar com: uvicorn app.main:app --reload
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers import eventos, parceiros, leads, dashboard

# Cria as tabelas no banco se ainda não existirem
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Portal Talent Attraction - Mercado Livre",
              description="Fonte única de dados para eventos, parceiros e leads.")

# CORS: deixa o front (as páginas HTML) chamar a API de outra porta
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])

app.include_router(eventos.router)
app.include_router(parceiros.router)
app.include_router(leads.router)
app.include_router(dashboard.router)


@app.get("/", tags=["Status"])
def raiz():
    return {"status": "ok", "docs": "/docs"}
