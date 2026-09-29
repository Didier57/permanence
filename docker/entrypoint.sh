#!/bin/sh
set -e

# Rend les binaires locaux (prisma, tsx, next) accessibles aux commandes
# qui ne passent pas par npm (Prisma lance le seed via spawn).
PATH="/app/node_modules/.bin:$PATH"
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
    if node_modules/.bin/prisma migrate deploy; then
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
  node_modules/.bin/prisma migrate status || true

  if [ "${RUN_SEED:-true}" = "true" ]; then
    echo "[entrypoint] Execution du seed (creation/mise a jour du compte admin)..."
    if ! node_modules/.bin/prisma db seed; then
      echo "[entrypoint] ATTENTION: le seed a echoue. Verifiez DATABASE_URL et ADMIN_EMAIL/ADMIN_PASSWORD."
    fi
  fi
fi

exec "$@"
