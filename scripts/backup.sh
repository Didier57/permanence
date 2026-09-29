#!/bin/sh
# Sauvegarde de la base PostgreSQL dans un fichier compresse horodate.
# Usage : ./scripts/backup.sh [repertoire_de_sortie]
set -e

BACKUP_DIR="${1:-./backups}"
PG_USER="${POSTGRES_USER:-permanence}"
PG_DB="${POSTGRES_DB:-permanence}"
DB_SERVICE="${DB_SERVICE:-db}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$BACKUP_DIR/permanence-$STAMP.sql.gz"

echo "Sauvegarde de la base '$PG_DB'..."
docker compose exec -T "$DB_SERVICE" pg_dump -U "$PG_USER" -d "$PG_DB" | gzip > "$FILE"
echo "Sauvegarde ecrite : $FILE"
