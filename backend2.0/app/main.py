# Ponto de entrada da API.
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from . import models  
from .database import Base, engine
from .routers import eventos, parceiros, leads, dashboard

# Cria as tabelas no banco se ainda não existirem
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Portal Talent Attraction - Mercado Livre",
              description="Fonte única de dados para eventos, parceiros e leads.")


app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])


@app.exception_handler(IntegrityError)
async def erro_de_integridade(request: Request, exc: IntegrityError):
    # Qualquer violação de regra do banco (duplicado, vínculo inexistente...) vira 409 em vez de erro 500
    return JSONResponse(status_code=409,
                        content={"detail": "Operação não permitida: dado duplicado ou ligado a outros registros."})


app.include_router(eventos.router)
app.include_router(parceiros.router)
app.include_router(leads.router)
app.include_router(dashboard.router)


@app.get("/", tags=["Status"])
def raiz():
    return {"status": "ok", "docs": "/docs"}
