# Portal Talent Attraction – Backend

API em FastAPI + MySQL com eventos, parceiros e leads, controle de acesso por perfil e indicadores para dashboards.

> Versão de demonstração: o perfil vem no header `X-Perfil`, que qualquer um pode forjar. Não usar com dados reais.

## Como rodar

```bash
mysql -u root -p < banco.sql          # cria o banco 
pip install -r requirements.txt       # dentro de backend/
uvicorn app.main:app --reload         # dentro de backend/
```

Docs: http://127.0.0.1:8000/docs

Conexão via variáveis `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME` (padrão: `root/root@localhost:3306/meli_ta`).


## Caso o Mysql Não funcione:

Crie ESTE banco no XAMPP/MySQl Workbench 

<!-- CREATE DATABASE IF NOT EXISTS meli_ta CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'meli'@'localhost' IDENTIFIED BY 'meli123';
GRANT ALL PRIVILEGES ON meli_ta.* TO 'meli'@'localhost';
FLUSH PRIVILEGES; -->

Em seguida cole esse comando no powershell:

$env:DB_USER="meli"
$env:DB_PASSWORD="meli123"
uvicorn app.main:app --reload

## Perfis

`talent_attraction`, `taops`, `online`, `pcd`, `divulgacao` — enviar no header `X-Perfil`.

```bash
curl -H "X-Perfil: talent_attraction" http://127.0.0.1:8000/eventos/
```

## Endpoints

- `/eventos/` — CRUD (escrita só `talent_attraction`; leitura todos)
- `/parceiros/` — criar (`talent_attraction`, `taops`) e listar (todos)
- `/leads/` — criar e listar (`talent_attraction`, `taops`)
- `/dashboard/indicadores` e `/dashboard/cobertura` — todos

Use sempre a barra final nas rotas (`/eventos/`).

## Arquivos

- `app/main.py` — ponto de entrada, CORS e routers
- `app/database.py` — conexão MySQL e sessão
- `app/models.py` — tabelas
- `app/schemas.py` — formato de entrada/saída
- `app/auth.py` — validação de perfil
- `app/routers/` — rotas de eventos, parceiros, leads e dashboard


