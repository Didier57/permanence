#!/bin/sh
set -e

# Le conteneur "app" applique les migrations et le seed au demarrage.
# Le conteneur "worker" demarre avec RUN_MIGRATIONS=false.
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "[entrypoint] Application des migrations Prisma..."
  node_modules/.bin/prisma migrate deploy

  if [ "${RUN_SEED:-true}" = "true" ]; then
    echo "[entrypoint] Execution du seed (creation de l'admin si absent)..."
    node_modules/.bin/prisma db seed || echo "[entrypoint] Seed ignore (deja effectue ou non configure)."
  fi
fi

exec "$@"
