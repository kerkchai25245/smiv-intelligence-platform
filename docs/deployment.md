# Production deployment

## Server requirements

Use a Linux VM with Docker Engine, Compose v2, Git, a DNS record, and a TLS terminating load balancer or reverse proxy. Keep PostgreSQL private and restrict SSH at the firewall.

1. Clone the repository to the server.
2. Copy `.env.production.example` to `.env.production` and replace every example secret.
3. Configure HTTPS before accepting real health data. The included Nginx gateway listens internally on port 8080; terminate TLS in the cloud load balancer or host proxy.
4. Start with `docker compose --env-file .env.production -f compose.yaml -f compose.production.yaml up -d --build`.
5. Verify `/health/live`, `/api/v1/health/ready`, login, import, search, dashboard, map, and audit access.

## GitHub environment

Create a protected `production` environment with `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, and `DEPLOY_PATH` secrets. Deployment runs manually or for version tags. Require reviewer approval for health-data environments.

## Backup and recovery

Run `scripts/backup.sh` from a protected scheduled job after loading `.env.production`. Encrypt backups, copy them to separate storage, and test `scripts/restore.sh` at least quarterly. A backup is not trusted until a restore test succeeds.

## Go-live gate

Do not load personal health information until HTTPS, Google OAuth restrictions, least-privilege roles, audit retention, encrypted backups, incident ownership, and local legal/privacy review are complete.
