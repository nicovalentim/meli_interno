# Login: confere e-mail e senha e devolve o perfil (admin ou user) do usuário.
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models, schemas
from ..auth import confere_senha, gerar_hash_senha
from ..database import get_db

router = APIRouter(prefix="/login", tags=["Login"])

# hash de uma senha qualquer: gasta o mesmo tempo quando o e-mail não existe (não revela quais e-mails existem)
HASH_FALSO = gerar_hash_senha("senha-que-ninguem-usa")


@router.post("", response_model=schemas.LoginOut)
@router.post("/", response_model=schemas.LoginOut, include_in_schema=False)
def entrar(dados: schemas.LoginIn, db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter_by(email=dados.email).first()
    senha_certa = confere_senha(dados.senha, usuario.senha_hash if usuario else HASH_FALSO)

    if not usuario or not senha_certa:
        raise HTTPException(401, "E-mail ou senha incorretos")
    return usuario
