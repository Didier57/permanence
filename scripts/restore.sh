#!/bin/sh
# Restauration de la base PostgreSQL a partir d'un fichier .sql.gz
# Usage : ./scripts/restore.sh <fichier.sql.gz>
set -e

FILE="$1"
if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  echo "Usage: $0 <fichier.sql.gz>"
  exit 1
fi

PG_USER="${POSTGRES_USER:-permanence}"
PG_DB="${POSTGRES_DB:-permanence}"
DB_SERVICE="${DB_SERVICE:-db}"

echo "Arret des services applicatifs..."
docker compose stop app worker

echo "Restauration de '$FILE' dans la base '$PG_DB'..."
gunzip -c "$FILE" | docker compose exec -T "$DB_SERVICE" psql -U "$PG_USER" -d "$PG_DB"

echo "Redemarrage des services applicatifs..."
docker compose start app worker

echo "Restauration terminee."
