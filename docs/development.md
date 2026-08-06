# Development guide

## Configuration

Copy `.env.example` to `.env`. Never commit `.env`. Replace the example database password before starting containers.

## API conventions

- Versioned product endpoints live under `/api/v1`.
- `/health/live` must not depend on external services.
- `/api/v1/health/ready` checks PostgreSQL connectivity.
- Add domain routes in `app/api/routes` and register them in `app/api/router.py`.

## Web conventions

- Keep API calls relative to `VITE_API_BASE_URL` so the same build works behind the gateway.
- Add component tests beside components.
- Treat TypeScript and lint warnings as CI failures.

## Definition of done

Every change should pass API lint/tests, web lint/type-check/tests/build, and container configuration validation. Update documentation and `.env.example` whenever configuration changes.

