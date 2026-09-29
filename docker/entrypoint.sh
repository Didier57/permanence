#!/bin/sh
set -e

# Rend les binaires locaux (prisma, tsx, next) accessibles aux commandes
# qui ne passent pas par npm (Prisma lance le seed via spawn).
PATH="/app/node_modules/.bin:$PATH"
export PATH

# Le conteneur "app" applique les migrations et le seed au demarrage.
# Le conteneur "worker" demarre avec RUN_MIGRATIONS=false.
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "[entrypoint] Application des migrations Prisma..."
  node_modules/.bin/prisma migrate deploy

  if [ "${RUN_SEED:-true}" = "true" ]; then
    echo "[entrypoint] Execution du seed (creation/mise a jour du compte admin)..."
    if ! node_modules/.bin/prisma db seed; then
      echo "[entrypoint] ATTENTION: le seed a echoue. Verifiez DATABASE_URL et ADMIN_EMAIL/ADMIN_PASSWORD."
    fi
  fi
fi

exec "$@"
