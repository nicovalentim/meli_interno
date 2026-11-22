# Dados de teste para conferir as páginas do front end. Arquivo separado, só para desenvolvimento.
#
# COMO LIGAR: o main.py tem um bloco "DADOS DE TESTE" (3 linhas de código) que faz duas coisas:
#     dados_teste.popular_ao_iniciar()       -> ao rodar app.py, grava no banco o que ainda não existe
#     app.include_router(dados_teste.router) -> liga as rotas deste arquivo (lista abaixo)
#
# ROTAS DESTE ARQUIVO
#   Dados de teste (manual):
#     POST /dados-teste               -> acrescenta o que ainda não existe
#     POST /dados-teste?limpar=true   -> APAGA tudo o que é de teste e recria do zero
#         Header obrigatório: X-Perfil: admin
#         Pelo navegador: http://127.0.0.1:8000/docs -> seção "Dados de teste" -> Try it out
#   Contas de login de teste (tabela usuarios, senhas guardadas com hash):
#     admin@exemplo.com / admin123   -> perfil admin (vê tudo e acessa a página Administrativo)
#     user@exemplo.com  / user123    -> perfil user  (só consulta; não vê a página Administrativo)
#   Cursos e perfil (o que as páginas Desenvolvimento e Perfil leem; admin e user):
#     GET /cursos            -> [{ id, titulo, modulos, tempo_conclusao (minutos), imagem }]
#     GET /cursos/progresso  -> [{ curso_id, modulos_concluidos, ultimo_acesso }]  do perfil do header
#     GET /perfil            -> { nome, emprego, imagem, eventos_atendidos, vagas_candidatadas }  idem
#
# IMAGENS: parceiros, eventos, leads, cursos e perfis têm a coluna `imagem` (URL ou caminho a partir
# da raiz do site, ex.: "/rsc/imagens/comunidade.png"). Para dar uma imagem diferente a cada item,
# troque o último valor de cada linha das listas PARCEIROS, eventos_de_teste(), LEADS, CURSOS e
# USUARIOS abaixo. Os valores de exemplo usam arquivos que já existem em client/rsc; alguns itens
# ficam com None de propósito, para testar a imagem padrão do front end.
# Itens que já estavam no banco e sem imagem recebem a do exemplo ao reiniciar (nunca sobrescreve
# uma imagem que já esteja preenchida).
# A coluna nova das tabelas parceiros, eventos e leads também está em models.py e schemas.py.
#
# SEMESTRES: as datas dos eventos planejados e realizados são espalhadas por vários semestres
# (1º semestre = janeiro a junho, 2º = julho a dezembro), sempre em relação a hoje, para dar o que
# separar em qualquer época do ano. Eventos que já estão no banco mantêm a data antiga; para
# redistribuir, use POST /dados-teste?limpar=true (ou apague o arquivo do banco, meli_ta.db).
#
# O QUE É GRAVADO
#   - parceiros, eventos, leads e as 2 contas de login: tabelas que já existem (models.py).
#   - cursos, progresso e perfil: tabelas NOVAS, definidas aqui mesmo (teste_cursos,
#     teste_progresso_cursos, teste_usuarios). O servidor não tem usuários, só perfis (header
#     X-Perfil), então progresso e perfil são guardados por perfil: cada perfil enxerga o seu.
#     Quem não tem linha na tabela vê as páginas vazias (bom para testar).
#     Para ver o outro perfil, saia (menu do avatar -> Sair) e entre com a outra conta de teste.
#
# BANCO JÁ EXISTENTE: se o arquivo do banco foi criado antes da coluna `imagem`, ela é acrescentada
# sozinha ao iniciar (ALTER TABLE), sem perder nada. Com MySQL isso NÃO é feito: o terminal mostra
# os comandos SQL para você rodar.
#
# AO INICIAR (automático): depois que o main.py cria as tabelas, grava tudo isso. Só acrescenta o que
# falta (pode reiniciar à vontade, não duplica) e nunca impede o servidor de subir: se algo falhar,
# só avisa no terminal.
#     DADOS_TESTE=0   -> desliga a gravação automática (as rotas continuam disponíveis)
#
# SEGURANÇA: com MySQL (variável DB_USER definida) nada é gravado, nem ao iniciar nem pela rota,
# a não ser que PERMITIR_DADOS_TESTE=1.
# ANTES DE PUBLICAR: apagar este arquivo e o bloco "DADOS DE TESTE" do main.py. As rotas /cursos,
# /cursos/progresso e /perfil somem junto; as tabelas teste_* ficam no arquivo do banco, sem uso.
# (A coluna `imagem` de models.py/schemas.py é parte do projeto e continua.)

import os
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import Column, Integer, String, Date, ForeignKey, UniqueConstraint, inspect, text
from sqlalchemy.orm import Session
from .. import models
from ..database import Base, engine, get_db, SessionLocal
from ..auth import exige_perfil, perfil_atual, gerar_hash_senha

router = APIRouter()
TAG_TESTE = ["Dados de teste"]
TAG_LEITURA = ["Cursos e perfil (dados de teste)"]

# ---------------------------------------------------------------------------------------------
# Tabelas novas (só de teste). Ficam aqui para não mexer no models.py.
# ---------------------------------------------------------------------------------------------

class TCurso(Base):
    __tablename__ = "teste_cursos"
    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(120), nullable=False, unique=True)
    modulos = Column(Integer, nullable=False)
    tempo_conclusao = Column(Integer, nullable=False)   # em minutos
    imagem = Column(String(300))                        # URL da imagem do curso


class TProgressoCurso(Base):
    __tablename__ = "teste_progresso_cursos"
    __table_args__ = (UniqueConstraint("perfil", "curso_id"),)
    id = Column(Integer, primary_key=True, index=True)
    perfil = Column(String(30), nullable=False, index=True)   # valor do header X-Perfil
    curso_id = Column(Integer, ForeignKey("teste_cursos.id"), nullable=False)
    modulos_concluidos = Column(Integer, nullable=False, default=0)
    ultimo_acesso = Column(Date)


class TUsuario(Base):
    __tablename__ = "teste_usuarios"
    perfil = Column(String(30), primary_key=True)   # valor do header X-Perfil
    nome = Column(String(120), nullable=False)
    emprego = Column(String(120))
    imagem = Column(String(300))                    # URL da imagem de perfil
    eventos_atendidos = Column(Integer, default=0)
    vagas_candidatadas = Column(Integer, default=0)


# o main.py já criou as tabelas dele antes de importar este arquivo: cria só as de teste
Base.metadata.create_all(bind=engine, tables=[TCurso.__table__, TProgressoCurso.__table__, TUsuario.__table__])


def _banco_protegido() -> bool:
    # DB_USER definido = MySQL (o banco "de verdade"): só libera com PERMITIR_DADOS_TESTE=1.
    return bool(os.getenv("DB_USER")) and os.getenv("PERMITIR_DADOS_TESTE") != "1"


# Tabelas que têm a coluna `imagem`
TABELAS_COM_IMAGEM = ("parceiros", "eventos", "leads", "teste_cursos")


def _garantir_colunas_imagem():
    """create_all não altera tabelas que já existem: bancos criados antes da coluna `imagem` não a têm."""
    try:
        banco = inspect(engine)
        faltando = [t for t in TABELAS_COM_IMAGEM
                    if "imagem" not in {c["name"] for c in banco.get_columns(t)}]
    except Exception as erro:
        print(f"Dados de teste: não foi possível conferir a coluna imagem ({erro}).")
        return
    if not faltando:
        return

    comandos = [f"ALTER TABLE {t} ADD COLUMN imagem VARCHAR(300)" for t in faltando]
    if _banco_protegido():
        print("Dados de teste: faltou a coluna imagem (banco MySQL: não alterado). Rode no banco:")
        for comando in comandos:
            print(f"    {comando};")
        return
    try:
        with engine.begin() as conexao:
            for comando in comandos:
                conexao.execute(text(comando))
        print(f"Dados de teste: coluna imagem acrescentada em {', '.join(faltando)}.")
    except Exception as erro:
        print(f"Dados de teste: não foi possível acrescentar a coluna imagem ({erro}).")


_garantir_colunas_imagem()

# ---------------------------------------------------------------------------------------------
# Dados. Cada item foi pensado para exercitar uma parte diferente do front end.
# O último valor de cada linha é a imagem: troque pelo caminho da imagem de cada item.
# ---------------------------------------------------------------------------------------------

IMG = "/rsc/imagens/"                 # arquivos que já existem em client/rsc/imagens
AVATAR = "/rsc/icones/avatar.png"

# (nome, tipo, regiao, imagem)
PARCEIROS = [
    ("USP", "instituição de ensino", "Sudeste", IMG + "comunidade.png"),
    ("UFMG", "instituição de ensino", "Sudeste", IMG + "carreiras.png"),
    ("SENAI Bahia", "instituição de ensino", "Nordeste", IMG + "desenvolvimento.png"),
    ("UFRGS", "instituição de ensino", "Sul", IMG + "beneficios.png"),
    ("Instituto Reconstruir", "ong", "Centro-Oeste", IMG + "home.png"),
    ("TechBridge Brasil", "empresa", "Norte", IMG + "eventos.png"),
    ("ONG Caminhos", "ong", None, None),   # sem região, sem imagem e sem nenhum evento: "0 eventos"
]


def _inicio_semestre(dia: date, deslocamento: int = 0) -> date:
    """Primeiro dia do semestre de `dia` (1º: jan-jun, 2º: jul-dez), deslocado por `deslocamento` semestres."""
    meses = dia.year * 12 + (0 if dia.month <= 6 else 6) + 6 * deslocamento
    return date(meses // 12, meses % 12 + 1, 1)


def eventos_de_teste(hoje: date):
    """Datas relativas a hoje: passados e futuros, em vários semestres."""
    def d(dias):
        return hoje + timedelta(days=dias)

    def sem(deslocamento, dias):   # `dias` depois do início do semestre (deslocamento 1 = o próximo)
        return _inicio_semestre(hoje, deslocamento) + timedelta(days=dias)

    # (nome, data, local, regiao, vagas, status, responsavel, parceiro, imagem)
    return [
        # --- realizados (aba Novidades; indicador "realizados"; leads abaixo ficam nestes) ---
        # os dois primeiros caem no semestre anterior; os outros, perto de hoje
        ("Feira de Carreiras USP", sem(-1, 60), "Campus Butantã, São Paulo", "Sudeste", 15, "realizado", "Marina Costa", "USP", IMG + "eventos.png"),
        ("Hackathon UFMG", sem(-1, 130), "Belo Horizonte", "Sudeste", 8, "realizado", "Rodrigo Nunes", "UFMG", IMG + "carreiras.png"),
        ("Semana de Tecnologia SENAI", d(-40), "Salvador", "Nordeste", 10, "realizado", "Marina Costa", "SENAI Bahia", IMG + "desenvolvimento.png"),
        ("Palestra Mulheres na Tecnologia", d(-12), "Porto Alegre", "Sul", 0, "realizado", "Paula Mendes", "UFRGS", IMG + "comunidade.png"),   # 0 vagas: card sem "vagas"
        ("Mutirão de Currículos", d(-5), "Goiânia", "Centro-Oeste", 1, "realizado", "Rodrigo Nunes", "Instituto Reconstruir", IMG + "beneficios.png"),  # 1 vaga: singular

        # --- planejados (Home, Carreiras, aba Eventos, gráfico por mês): 4 semestres diferentes ---
        ("Feira de Estágios UFRGS", d(10), "Porto Alegre", "Sul", 20, "planejado", "Paula Mendes", "UFRGS", IMG + "home.png"),
        ("Workshop de Dados", d(25), "São Paulo", "Sudeste", 12, "planejado", "Marina Costa", "USP", IMG + "desenvolvimento.png"),
        ("Open Day Mercado Livre", sem(1, 20), "Osasco", "Sudeste", 30, "planejado", "Rodrigo Nunes", None, IMG + "eventos.png"),   # sem parceiro
        ("Encontro de Talentos do Norte", sem(1, 75), "Manaus", "Norte", 6, "planejado", "Paula Mendes", "TechBridge Brasil", IMG + "comunidade.png"),
        ("Jornada de Carreira SENAI", sem(2, 30), "Salvador", "Nordeste", 14, "planejado", "Marina Costa", "SENAI Bahia", IMG + "carreiras.png"),
        ("Meetup de Engenharia", sem(2, 100), "Belo Horizonte", "Sudeste", 9, "planejado", "Rodrigo Nunes", "UFMG", IMG + "beneficios.png"),
        ("Feira Virtual de Vagas", sem(3, 45), "Online", None, 25, "planejado", "Paula Mendes", None, None),   # sem região, sem parceiro e sem imagem

        # --- casos de borda ---
        # cancelado: não aparece em Carreiras/Home, não entra na cobertura nem na contagem do parceiro
        ("Roadshow Regional", d(20), "Curitiba", "Sul", 10, "cancelado", "Paula Mendes", "UFRGS", IMG + "home.png"),
        # planejado com data já passada: aparece em Carreiras, mas a Home ignora (só mostra de hoje em diante)
        ("Evento Reagendado", d(-3), "Recife", "Nordeste", 5, "planejado", "Marina Costa", "SENAI Bahia", IMG + "eventos.png"),
    ]


# (nome, email, evento, imagem). Só TA e TAOps enxergam os leads (GET /leads).
LEADS = [
    ("Ana Beatriz Lima", "ana.lima@exemplo.com", "Feira de Carreiras USP", AVATAR),
    ("Carlos Eduardo Souza", "carlos.souza@exemplo.com", "Feira de Carreiras USP", AVATAR),
    ("Juliana Pereira", None, "Feira de Carreiras USP", AVATAR),   # sem e-mail
    ("Rafael Martins", "rafael.martins@exemplo.com", "Hackathon UFMG", AVATAR),
    ("Fernanda Oliveira", "fernanda.o@exemplo.com", "Hackathon UFMG", None),   # sem imagem
    ("Paulo Henrique Alves", None, "Semana de Tecnologia SENAI", AVATAR),
    ("Larissa Gomes", "larissa.gomes@exemplo.com", "Semana de Tecnologia SENAI", AVATAR),
    ("Thiago Ribeiro", "thiago.r@exemplo.com", "Palestra Mulheres na Tecnologia", AVATAR),
    ("Camila Duarte", "camila.duarte@exemplo.com", "Mutirão de Currículos", AVATAR),
]

# (titulo, modulos, tempo_conclusao em minutos, imagem)
CURSOS = [
    ("Trilha de Liderança", 14, 420, IMG + "desenvolvimento.png"),
    ("Liderança e Gestão de Pessoas", 8, 120, IMG + "carreiras.png"),
    ("Comunicação Eficaz", 6, 90, IMG + "comunidade.png"),
    ("Excel para Análise de Dados", 10, 300, IMG + "home.png"),
    ("Feedback na Prática", 4, 45, None),   # sem imagem
]


def progresso_de_teste(hoje: date):
    """Por perfil: (curso, modulos_concluidos, ultimo_acesso). Cada perfil testa uma situação diferente."""
    def d(dias):
        return hoje + timedelta(days=dias)

    return {
        # user: dois em andamento, dois concluídos
        "user": [("Trilha de Liderança", 10, d(-4)), ("Comunicação Eficaz", 2, d(-11)),
                 ("Excel para Análise de Dados", 10, d(-24)), ("Feedback na Prática", 4, d(-40))],
        # admin: um concluído, um em andamento
        "admin": [("Trilha de Liderança", 14, d(-2)), ("Liderança e Gestão de Pessoas", 3, d(-6))],
    }


# perfil -> (nome, emprego, imagem, eventos_atendidos, vagas_candidatadas)
USUARIOS = {
    "admin": ("Marina Costa", "Coordenadora de Talent Attraction", AVATAR, 12, 0),   # 0 vagas: mostra "0"
    "user": ("Ana Beatriz Lima", "Analista de Atração de Talentos Jr", AVATAR, 6, 3),
}

# (nome, email, senha, perfil, imagem): contas para entrar no site
CONTAS = [
    ("Marina Costa", "admin@exemplo.com", "admin123", "admin", AVATAR),
    ("Ana Beatriz Lima", "user@exemplo.com", "user123", "user", AVATAR),
]


# ---------------------------------------------------------------------------------------------
# Gravação (usada ao iniciar e pela rota)
# ---------------------------------------------------------------------------------------------

def _preencher_imagem(registro, imagem, resumo):
    """Item que já existia sem imagem recebe a do exemplo. Nunca sobrescreve uma imagem já preenchida."""
    if imagem and not registro.imagem:
        registro.imagem = imagem
        resumo["imagens_preenchidas"] += 1


def popular_banco(db: Session, limpar: bool = False) -> dict:
    """Grava os dados de teste e devolve um resumo do que foi criado.

    Com o que está em PARCEIROS, eventos_de_teste() e LEADS, o front end deve mostrar
    (GET /dashboard/indicadores): 14 eventos, 5 realizados, 7 parceiros, 9 leads.
    Cobertura por região, sem os cancelados (GET /dashboard/cobertura):
    Sudeste 5, Nordeste 3, Sul 2, Centro-Oeste 1, Norte 1, "sem região" 1.
    Eventos por status: 8 planejados, 5 realizados, 1 cancelado.
    """
    resumo = {"apagados": None, "imagens_preenchidas": 0,
              "parceiros": {"criados": 0, "ja_existiam": 0},
              "eventos": {"criados": 0, "ja_existiam": 0},
              "leads": {"criados": 0, "ja_existiam": 0},
              "cursos": {"criados": 0, "ja_existiam": 0},
              "progresso": {"criados": 0, "ja_existiam": 0},
              "perfis": {"criados": 0, "ja_existiam": 0},
              "contas": {"criados": 0, "ja_existiam": 0}}

    if limpar:
        # ordem importa: leads dependem de eventos, e eventos de parceiros
        resumo["apagados"] = {"leads": db.query(models.Lead).delete(),
                              "eventos": db.query(models.Evento).delete(),
                              "parceiros": db.query(models.Parceiro).delete(),
                              "progresso": db.query(TProgressoCurso).delete(),
                              "cursos": db.query(TCurso).delete(),
                              "perfis": db.query(TUsuario).delete(),
                              # só as contas de teste: contas reais não são apagadas
                              "contas": db.query(models.Usuario).filter(
                                  models.Usuario.email.in_([c[1] for c in CONTAS])).delete(synchronize_session=False)}

    # a sessão não envia sozinha (autoflush desligado): flush() é o que gera os ids usados abaixo
    parceiros = {}
    for nome, tipo, regiao, imagem in PARCEIROS:
        parceiro = db.query(models.Parceiro).filter_by(nome=nome).first()
        if parceiro:
            resumo["parceiros"]["ja_existiam"] += 1
            _preencher_imagem(parceiro, imagem, resumo)
        else:
            parceiro = models.Parceiro(nome=nome, tipo=tipo, regiao=regiao, imagem=imagem)
            db.add(parceiro)
            db.flush()
            resumo["parceiros"]["criados"] += 1
        parceiros[nome] = parceiro

    eventos = {}
    for nome, data, local, regiao, vagas, status, responsavel, nome_parceiro, imagem in eventos_de_teste(date.today()):
        evento = db.query(models.Evento).filter_by(nome=nome).first()   # o nome identifica o evento de teste
        if evento:
            resumo["eventos"]["ja_existiam"] += 1
            _preencher_imagem(evento, imagem, resumo)
        else:
            parceiro = parceiros.get(nome_parceiro)
            evento = models.Evento(nome=nome, data=data, local=local, regiao=regiao, vagas=vagas,
                                   status=status, responsavel=responsavel, imagem=imagem,
                                   parceiro_id=parceiro.id if parceiro else None)
            db.add(evento)
            db.flush()
            resumo["eventos"]["criados"] += 1
        eventos[nome] = evento

    for nome, email, nome_evento, imagem in LEADS:
        evento = eventos[nome_evento]
        lead = db.query(models.Lead).filter_by(nome=nome, evento_id=evento.id).first()
        if lead:
            resumo["leads"]["ja_existiam"] += 1
            _preencher_imagem(lead, imagem, resumo)
        else:
            db.add(models.Lead(nome=nome, email=email, evento_id=evento.id, imagem=imagem))
            db.flush()
            resumo["leads"]["criados"] += 1

    # cursos, progresso por perfil e dados de perfil
    cursos = {}
    for titulo, modulos, tempo, imagem in CURSOS:
        curso = db.query(TCurso).filter_by(titulo=titulo).first()
        if curso:
            resumo["cursos"]["ja_existiam"] += 1
            _preencher_imagem(curso, imagem, resumo)
        else:
            curso = TCurso(titulo=titulo, modulos=modulos, tempo_conclusao=tempo, imagem=imagem)
            db.add(curso)
            db.flush()
            resumo["cursos"]["criados"] += 1
        cursos[titulo] = curso

    for perfil, linhas in progresso_de_teste(date.today()).items():
        for titulo, concluidos, ultimo in linhas:
            curso = cursos[titulo]
            if db.query(TProgressoCurso).filter_by(perfil=perfil, curso_id=curso.id).first():
                resumo["progresso"]["ja_existiam"] += 1
            else:
                db.add(TProgressoCurso(perfil=perfil, curso_id=curso.id,
                                       modulos_concluidos=concluidos, ultimo_acesso=ultimo))
                db.flush()
                resumo["progresso"]["criados"] += 1

    for perfil, (nome, emprego, imagem, eventos_atendidos, vagas_candidatadas) in USUARIOS.items():
        usuario = db.get(TUsuario, perfil)
        if usuario:
            resumo["perfis"]["ja_existiam"] += 1
            _preencher_imagem(usuario, imagem, resumo)
        else:
            db.add(TUsuario(perfil=perfil, nome=nome, emprego=emprego, imagem=imagem,
                            eventos_atendidos=eventos_atendidos, vagas_candidatadas=vagas_candidatadas))
            db.flush()
            resumo["perfis"]["criados"] += 1

    for nome, email, senha, perfil, imagem in CONTAS:
        conta = db.query(models.Usuario).filter_by(email=email).first()
        if conta:
            resumo["contas"]["ja_existiam"] += 1
        else:
            db.add(models.Usuario(nome=nome, email=email, senha_hash=gerar_hash_senha(senha),
                                  perfil=perfil, imagem=imagem))
            db.flush()
            resumo["contas"]["criados"] += 1

    db.commit()
    return resumo


# ---------------------------------------------------------------------------------------------
# Ao iniciar o servidor (chamado pelo bloco "DADOS DE TESTE" do main.py)
# ---------------------------------------------------------------------------------------------

def popular_ao_iniciar():
    """Grava o que falta, sem apagar nada. Nunca levanta erro: se falhar, só avisa no terminal."""
    if os.getenv("DADOS_TESTE") == "0":
        print("Dados de teste: gravação automática desligada (DADOS_TESTE=0).")
        return
    if _banco_protegido():
        print("Dados de teste: não gravados (banco MySQL). Defina PERMITIR_DADOS_TESTE=1 para liberar.")
        return

    db = SessionLocal()
    try:
        r = popular_banco(db)
        criados = {tabela: r[tabela]["criados"] for tabela in
                   ("parceiros", "eventos", "leads", "cursos", "progresso", "perfis", "contas")}
        if any(criados.values()):
            print(f"Dados de teste gravados: {criados['parceiros']} parceiros, {criados['eventos']} eventos, "
                  f"{criados['leads']} leads, {criados['cursos']} cursos, "
                  f"{criados['progresso']} registros de progresso, {criados['perfis']} perfis, "
                  f"{criados['contas']} contas de login.")
        else:
            print("Dados de teste: já estavam no banco.")
        print("Contas de teste: admin@exemplo.com / admin123 (admin) e user@exemplo.com / user123 (user).")
        if r["imagens_preenchidas"]:
            print(f"Dados de teste: {r['imagens_preenchidas']} imagens preenchidas em itens que estavam sem imagem.")
    except Exception as erro:   # o servidor sobe mesmo assim
        db.rollback()
        print(f"Dados de teste: não foi possível gravar ({erro}).")
    finally:
        db.close()


# ---------------------------------------------------------------------------------------------
# A rota (para refazer na mão, inclusive apagando tudo antes)
# ---------------------------------------------------------------------------------------------

@router.post("/dados-teste", tags=TAG_TESTE)
@router.post("/dados-teste/", include_in_schema=False)
def popular(limpar: bool = False, db: Session = Depends(get_db),
            _=Depends(exige_perfil("admin"))):
    """Grava os dados de teste (ver popular_banco). Com ?limpar=true apaga tudo o que é de teste antes."""
    if _banco_protegido():
        raise HTTPException(403, "Dados de teste desligados para MySQL. "
                                 "Defina PERMITIR_DADOS_TESTE=1 se tiver certeza.")
    return popular_banco(db, limpar)


# ---------------------------------------------------------------------------------------------
# Rotas de leitura que o front end usa nas páginas Desenvolvimento e Perfil
# ---------------------------------------------------------------------------------------------

@router.get("/cursos", tags=TAG_LEITURA)
def listar_cursos(db: Session = Depends(get_db), _=Depends(perfil_atual)):
    """Lista de cursos (global.js -> cursos.comProgresso)."""
    return [{"id": c.id, "titulo": c.titulo, "modulos": c.modulos,
             "tempo_conclusao": c.tempo_conclusao, "imagem": c.imagem}
            for c in db.query(TCurso).order_by(TCurso.id).all()]


@router.get("/cursos/progresso", tags=TAG_LEITURA)
def progresso_dos_cursos(db: Session = Depends(get_db), perfil: str = Depends(perfil_atual)):
    """Quanto o perfil do header já fez de cada curso (global.js -> cursos.comProgresso)."""
    linhas = db.query(TProgressoCurso).filter_by(perfil=perfil).order_by(TProgressoCurso.curso_id).all()
    return [{"curso_id": l.curso_id, "modulos_concluidos": l.modulos_concluidos,
             "ultimo_acesso": l.ultimo_acesso.isoformat() if l.ultimo_acesso else None}
            for l in linhas]


@router.get("/perfil", tags=TAG_LEITURA)
def meu_perfil(db: Session = Depends(get_db), perfil: str = Depends(perfil_atual)):
    """Dados do perfil do header (perfil.js -> hooks nome, emprego, imagem e indicadores)."""
    usuario = db.get(TUsuario, perfil)
    if not usuario:
        raise HTTPException(404, "Perfil sem dados")
    return {"nome": usuario.nome, "emprego": usuario.emprego, "imagem": usuario.imagem,
            "eventos_atendidos": usuario.eventos_atendidos,
            "vagas_candidatadas": usuario.vagas_candidatadas}
