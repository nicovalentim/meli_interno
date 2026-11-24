
# !!! Em produção, trocar por login real (JWT/SSO): este header pode ser forjado por qualquer pessoa. !!!
import hashlib
import hmac
import secrets
from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from . import models
from .database import get_db

PERFIS = {"admin", "user"}


def perfil_atual(x_perfil: str = Header(default="")):
    if x_perfil not in PERFIS:
        raise HTTPException(status_code=401, detail=f"Envie o header X-Perfil com um de: {sorted(PERFIS)}")
    return x_perfil


def exige_perfil(*permitidos: str):
    """Cria uma dependência que só deixa passar os perfis permitidos."""

    def checa(perfil: str = Depends(perfil_atual)):
        if perfil not in permitidos:
            raise HTTPException(status_code=403, detail="Seu perfil não tem acesso a este recurso")
        return perfil

    return checa


def gerar_hash_senha(senha: str) -> str:
    sal = secrets.token_bytes(16)
    resumo = hashlib.pbkdf2_hmac("sha256", senha.encode("utf-8"), sal, 200_000)
    return f"{sal.hex()}${resumo.hex()}"


def confere_senha(senha: str, guardado: str) -> bool:
    try:
        sal_hex, resumo_hex = guardado.split("$")
        sal, esperado = bytes.fromhex(sal_hex), bytes.fromhex(resumo_hex)
    except ValueError:
        return False
    resumo = hashlib.pbkdf2_hmac("sha256", senha.encode("utf-8"), sal, 200_000)
    return hmac.compare_digest(resumo, esperado)


def usuario_atual(x_usuario_id: int = Header(default=0), perfil: str = Depends(perfil_atual),
                  db: Session = Depends(get_db)):
    """Quem está chamando, pelo header X-Usuario-Id. Forjável como o X-Perfil: só para demonstração."""
    usuario = db.get(models.Usuario, x_usuario_id)
    if not usuario or usuario.perfil != perfil:
        raise HTTPException(status_code=401, detail="Usuário não identificado: faça login novamente")
    return usuario
