# Portal Talent Attraction – Backend

API em FastAPI com eventos, parceiros e leads, controle de acesso por perfil e indicadores para dashboards.

> **Versão de demonstração.** O perfil vem no header `X-Perfil`, que qualquer pessoa pode forjar. Não usar com dados reais.

## Como rodar (sem instalar banco)

Por padrão a API usa **SQLite**: um arquivo `meli_ta.db` criado sozinho na pasta do projeto. Não precisa de MySQL nem XAMPP.

Abra o PowerShell **dentro da pasta `backend`** (a que contém a pasta `app`) e rode:

```powershell
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Depois abra http://127.0.0.1:8000/docs para testar as rotas.

> Se aparecer `No module named 'app'`, você está na pasta errada. Use `dir`: ela deve listar `app`, `README.md` e `requirements.txt`.

## Usando MySQL (opcional)

1. Crie o banco (XAMPP/phpMyAdmin, aba SQL, ou MySQL Workbench):

```sql
CREATE DATABASE IF NOT EXISTS meli_ta CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'meli'@'localhost' IDENTIFIED BY 'meli123';
GRANT ALL PRIVILEGES ON meli_ta.* TO 'meli'@'localhost';
FLUSH PRIVILEGES;
```

2. Defina as variáveis e suba a API **na mesma janela** do PowerShell:

```powershell
$env:DB_USER="meli"
$env:DB_PASSWORD="meli123"
uvicorn app.main:app --reload
```

Variáveis disponíveis: `DB_USER`, `DB_PASSWORD`, `DB_HOST` (localhost), `DB_PORT` (3306), `DB_NAME` (meli_ta).
Quando `DB_USER` está definido a API usa MySQL; sem ele, usa SQLite.
Para voltar ao SQLite na mesma janela: `Remove-Item Env:DB_USER`.

## Perfis

`talent_attraction`, `taops`, `online`, `pcd`, `divulgacao`. Enviar no header `X-Perfil`.

```powershell
curl.exe -H "X-Perfil: talent_attraction" http://127.0.0.1:8000/eventos
```

## Endpoints

| Rota | Quem acessa |
|---|---|
| `GET /eventos` (filtros: `regiao`, `status`, `parceiro_id`) e `GET /eventos/{id}` | todos os perfis |
| `POST /eventos`, `PUT /eventos/{id}`, `PATCH /eventos/{id}`, `DELETE /eventos/{id}` | `talent_attraction` |
| `GET /parceiros` | todos os perfis |
| `POST /parceiros` | `talent_attraction`, `taops` |
| `GET /leads` (filtro: `evento_id`) e `POST /leads` | `talent_attraction`, `taops` |
| `GET /dashboard/indicadores` e `GET /dashboard/cobertura` | todos os perfis |

- `status` do evento: `planejado`, `realizado` ou `cancelado`.
- As listagens aceitam `limit` (padrão 100, máximo 500) e `offset`.
- `PUT` troca o evento inteiro; para mudar só alguns campos, use `PATCH`.
- Não dá para apagar um evento que tem leads (erro 409). Mude o status para `cancelado`.
- A cobertura por região não conta eventos cancelados.
- Todas as rotas funcionam com ou sem `/` no final.

## Usando no front (HTML/JS)

O CORS está liberado, então o front pode rodar em outra porta:

```js
const r = await fetch("http://localhost:8000/eventos", {
  headers: { "X-Perfil": "talent_attraction" }
});
const eventos = await r.json();
```

Em `POST`/`PUT`/`PATCH`, inclua também `"Content-Type": "application/json"` e `body: JSON.stringify(dados)`.

## Estrutura

```
backend/
├── README.md
├── requirements.txt
├── banco.sql              # só para MySQL (opcional)
├── .gitignore
└── app/
    ├── main.py            # ponto de entrada, CORS e routers
    ├── database.py        # conexão (SQLite por padrão, MySQL opcional)
    ├── models.py          # tabelas
    ├── schemas.py         # formato e regras dos dados
    ├── auth.py            # validação de perfil
    └── routers/           # eventos, parceiros, leads, dashboard
```

## Pendências conhecidas

- Trocar o `X-Perfil` por login real (JWT/SSO)
- LGPD nos leads: consentimento, data de criação, atualizar e apagar
- Padronizar as regiões (tabela ou lista fixa) para a cobertura não separar "SP" de "São Paulo"
- Migrações (Alembic): hoje `create_all` não altera tabelas já existentes
- Testes automatizados
