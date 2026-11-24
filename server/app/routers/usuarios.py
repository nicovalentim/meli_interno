# Perfil do usuário logado e foto de perfil (guardada como data URL base64 na coluna usuarios.imagem).
import base64
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from .. import models, schemas
from ..auth import usuario_atual
from ..database import get_db

router = APIRouter(tags=["Usuários"])


def _url_imagem(usuario: models.Usuario):
    return f"/usuarios/{usuario.id}/imagem" if usuario.imagem else None


@router.get("/perfil")
def meu_perfil(u: models.Usuario = Depends(usuario_atual)):
    """Dados do perfil (perfil.js). "emprego" é o cargo: o perfil.js lê esse nome."""
    return {"nome": u.nome, "emprego": u.cargo, "imagem": _url_imagem(u),
            "eventos_atendidos": u.eventos_atendidos or 0,
            "vagas_candidatadas": u.vagas_candidatadas or 0}


@router.put("/perfil/imagem", status_code=204)
def trocar_imagem(dados: schemas.ImagemIn, u: models.Usuario = Depends(usuario_atual),
                  db: Session = Depends(get_db)):
    u.imagem = dados.imagem
    db.commit()


@router.get("/usuarios/{usuario_id}/imagem")
def imagem_do_usuario(usuario_id: int, db: Session = Depends(get_db)):
    """Sem login de propósito: uma tag <img> não consegue mandar headers."""
    u = db.get(models.Usuario, usuario_id)
    if not u or not u.imagem:
        raise HTTPException(404, "Sem imagem")
    cabecalho, _, dados = u.imagem.partition(",")
    tipo = cabecalho.removeprefix("data:").split(";")[0]
    try:
        conteudo = base64.b64decode(dados)
    except ValueError:
        raise HTTPException(404, "Imagem inválida")
    return Response(conteudo, media_type=tipo, headers={"Cache-Control": "no-cache"})
