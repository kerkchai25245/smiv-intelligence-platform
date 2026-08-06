#!/bin/sh
set -eu
BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
docker compose exec -T db pg_dump -U "${POSTGRES_USER:?}" -d "${POSTGRES_DB:?}" --format=custom > "$BACKUP_DIR/smiv-$STAMP.dump"
find "$BACKUP_DIR" -type f -name 'smiv-*.dump' -mtime +"${BACKUP_RETENTION_DAYS:-30}" -delete
echo "Backup created: $BACKUP_DIR/smiv-$STAMP.dump"

