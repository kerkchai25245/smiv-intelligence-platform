# Architecture

## Request flow

```text
Browser -> Nginx gateway -> React web container
                         -> FastAPI container -> PostgreSQL
```

Nginx is the public edge on port 8080. It routes `/api/*` to FastAPI and all other paths to the static React application. PostgreSQL and application containers remain on the private Compose network.

## Design decisions

- The frontend and API are independently buildable and deployable.
- Environment-driven configuration keeps secrets out of source control.
- Liveness and readiness endpoints support orchestration and future deployment targets.
- Async database access provides a foundation for concurrent analytical workloads.
- Immutable frontend assets receive long cache lifetimes; SPA navigation falls back to `index.html`.
- CI grants read-only repository permissions and validates each deployable unit separately.

## Phase 1 boundaries

This foundation intentionally excludes domain entities, authentication, migrations, ingestion jobs, analytics models, and dashboard features. Those should be introduced after requirements and data contracts are agreed.

