#!/bin/sh
set -eu
FILE="${1:?Usage: ./scripts/restore.sh backup.dump}"
test -f "$FILE"
cat "$FILE" | docker compose exec -T db pg_restore -U "${POSTGRES_USER:?}" -d "${POSTGRES_DB:?}" --clean --if-exists --no-owner
echo "Restore completed from $FILE"

