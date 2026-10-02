#!/bin/sh
set -e

# Rend les binaires du worker (prisma, tsx) accessibles aux commandes qui ne
# passent pas par npm (Prisma lance le seed via spawn).
PRISMA_BIN="/app/worker_modules/node_modules/.bin/prisma"
PATH="/app/worker_modules/node_modules/.bin:$PATH"
export PATH

# Affiche la base de donnees visee (sans identifiants) : indispensable pour
# reperer un conteneur qui pointerait vers une autre base que l'application.
if [ -n "${DATABASE_URL:-}" ]; then
  echo "[entrypoint] Base de donnees visee : $(echo "$DATABASE_URL" | sed -E 's#://[^@/]*@#://***@#')"
fi

# Le conteneur "app" applique les migrations et le seed au demarrage.
# Le conteneur "worker" demarre avec RUN_SEED=false mais applique aussi les
# migrations (Prisma protege l'operation par un verrou : c'est sans risque).
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "[entrypoint] Application des migrations Prisma..."
  attempt=1
  while true; do
    if "$PRISMA_BIN" migrate deploy; then
      break
    fi
    if [ "$attempt" -ge 5 ]; then
      echo "[entrypoint] ERREUR : les migrations Prisma ont echoue ($attempt tentatives)."
      exit 1
    fi
    attempt=$((attempt + 1))
    echo "[entrypoint] Echec des migrations, nouvelle tentative dans 5 secondes..."
    sleep 5
  done

  echo "[entrypoint] Etat des migrations :"
  "$PRISMA_BIN" migrate status || true

  if [ "${RUN_SEED:-true}" = "true" ]; then
    echo "[entrypoint] Execution du seed (creation/mise a jour du compte admin)..."
    if ! "$PRISMA_BIN" db seed; then
      echo "[entrypoint] ATTENTION: le seed a echoue. Verifiez DATABASE_URL et ADMIN_EMAIL/ADMIN_PASSWORD."
    fi
  fi
fi

exec "$@"
