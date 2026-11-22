# Ponto de entrada da API.
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import IntegrityError
import os

from . import models  
from .database import Base, engine
from .routers import eventos, parceiros, leads, dashboard, login

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
app.include_router(login.router)

# ---------------------------------------------------------------------------------------------
# ADICIONADO: cria dados de teste pra conseguir ver as coisas na página
from .routers import dados_teste
dados_teste.popular_ao_iniciar()
app.include_router(dados_teste.router)
# ---------------------------------------------------------------------------------------------

# Caminho para a pasta client
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CLIENT_DIR = os.path.join(BASE_DIR, "client")

if os.path.exists(CLIENT_DIR):
    app.mount("/", StaticFiles(directory=CLIENT_DIR, html=True), name="client")

@app.get("/", tags=["Status"])
def raiz():
    index_path = os.path.join(CLIENT_DIR, "html/home.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"status": "ok", "docs": "/docs"}