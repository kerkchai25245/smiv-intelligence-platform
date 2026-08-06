# SMI-V Intelligence Platform

Production-oriented Phase 1 foundation for the SMI-V dashboard platform. The monorepo contains a React web application, a FastAPI service, PostgreSQL, an Nginx gateway, container orchestration, and continuous integration.

## Architecture

- `apps/web`: React 18, TypeScript, Vite
- `apps/api`: FastAPI, SQLAlchemy async, PostgreSQL
- `infra/nginx`: edge routing for `/` and `/api`
- `.github/workflows`: lint, type-check, test, and build checks
- `docs`: architecture and operating notes

## Run with Docker

1. Copy `.env.example` to `.env` and change `POSTGRES_PASSWORD`.
2. Run `docker compose up --build`.
3. Open <http://localhost:8080>.
4. API documentation is available at <http://localhost:8080/api/docs>.

The database is only exposed inside the Compose network. The gateway is the only public service.

## Local development

### API

```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

### Web

```bash
cd apps/web
pnpm install
pnpm dev
```

The Vite development server proxies `/api` to `http://localhost:8000`.

## Quality checks

```bash
cd apps/api && ruff check . && pytest
cd apps/web && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

See [docs/architecture.md](docs/architecture.md) and [docs/development.md](docs/development.md) for more detail.

