# SMI-V Intelligence Platform

Production-oriented platform for secure SMI-V data operations and executive intelligence. It supports Google authentication, role-based access, privacy-preserving Excel upserts, record history, audit trails, search, charts, GIS, V1–V4 union analysis, explainable insights, backup, and controlled deployment.

## Architecture

- `apps/web`: React 18, TypeScript, Vite
- `apps/api`: FastAPI, SQLAlchemy async, PostgreSQL
- `infra/nginx`: edge routing for `/` and `/api`
- `.github/workflows`: lint, type-check, test, and build checks
- `docs`: architecture and operating notes

## Capabilities

- Google OAuth login with JWT sessions and viewer/editor/admin roles
- Excel import with Thai/English headers and upsert by validated Thai national ID
- HMAC identifiers, history snapshots, and immutable audit events
- Executive totals, provincial distribution, patient search, and advanced V1–V4 filters
- AG Grid records, Apache ECharts analytics, Leaflet GIS, and all 15 V1–V4 unions
- Deterministic intelligence brief with an explicit engine label
- Alembic migrations, health/readiness probes, production hardening, backup/restore, and tagged deployment workflow

## Run with Docker

1. Copy `.env.example` to `.env` and replace every example password/secret.
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

See [architecture](docs/architecture.md), [data import](docs/data-import.md), [development](docs/development.md), and [deployment](docs/deployment.md) for more detail.
