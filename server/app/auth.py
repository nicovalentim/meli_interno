
# !!! Em produção, trocar por login real (JWT/SSO): este header pode ser forjado por qualquer pessoa. !!!
from fastapi import Depends, Header, HTTPException

PERFIS = {"talent_attraction", "taops", "online", "pcd", "divulgacao"}


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
