# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Image de base commune
# ---------------------------------------------------------------------------
FROM node:24-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ---------------------------------------------------------------------------
# Dependances (avec devDependencies pour le build)
# ---------------------------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---------------------------------------------------------------------------
# Build : generation du client Prisma + compilation Next.js (standalone)
# ---------------------------------------------------------------------------
FROM base AS builder
# DATABASE_URL factice : requise pour charger prisma.config.ts pendant le build.
# La vraie valeur est fournie au runtime par docker compose.
ARG DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public"
ENV DATABASE_URL=$DATABASE_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ---------------------------------------------------------------------------
# Dependances minimales du worker (prisma CLI, tsx, node-cron, libs runtime)
# Installees dans /worker_modules et resolues via NODE_PATH ; evite de copier
# les ~700 Mo de node_modules de build.
# ---------------------------------------------------------------------------
FROM base AS worker-deps
COPY docker/worker-package.json ./package.json
# Supprime Prisma Studio et ses dependances lourdes (inutiles pour
# `migrate deploy`, `migrate status` et `db seed`).
# NB : `effect` est volontairement CONSERVE, le CLI Prisma l'importe au
# chargement (sinon « Cannot find module 'effect' »).
RUN npm install --omit=dev --no-audit --no-fund \
  && npm cache clean --force \
  && rm -rf node_modules/@prisma/studio-core \
    node_modules/@prisma/dev \
    node_modules/@prisma/query-plan-executor \
    node_modules/@prisma/fetch-engine \
    node_modules/@prisma/streams-local \
    node_modules/@electric-sql \
    node_modules/elkjs \
    node_modules/remeda \
    node_modules/valibot

# ---------------------------------------------------------------------------
# Image d'execution (application web + worker de planification)
# ---------------------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
# Le worker et les commandes Prisma resolvent leurs dependances ici.
ENV NODE_PATH=/app/worker_modules/node_modules

# Application web : build standalone (server.js + node_modules minimal).
COPY --from=builder /app/.next/standalone ./
# Fichiers statiques non inclus dans le standalone.
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# Sources conservees pour le worker (tsx) et le seed Prisma.
COPY --from=builder /app/src ./src
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/docker/entrypoint.sh ./docker/entrypoint.sh
# Dependances minimales du worker.
COPY --from=worker-deps /app/node_modules ./worker_modules/node_modules

# tsx est charge par `node --import tsx` (seed Prisma) : cette resolution ESM
# ignore NODE_PATH, on l'expose donc directement dans node_modules.
RUN set -e; \
  mkdir -p ./node_modules/.bin; \
  for pkg in tsx esbuild; do \
    if [ -e "./worker_modules/node_modules/$pkg" ]; then \
      rm -rf "./node_modules/$pkg"; \
      ln -s "../worker_modules/node_modules/$pkg" "./node_modules/$pkg"; \
    fi; \
  done; \
  if [ -e "./worker_modules/node_modules/.bin/tsx" ]; then \
    ln -sf "../../worker_modules/node_modules/.bin/tsx" "./node_modules/.bin/tsx"; \
  fi

RUN chmod +x ./docker/entrypoint.sh && chown -R node:node /app
USER node

EXPOSE 3000

ENTRYPOINT ["./docker/entrypoint.sh"]
# Le serveur standalone de Next se lie a process.env.HOSTNAME. Docker definit
# TOUJOURS cette variable avec l'ID du conteneur (elle ecrase l'ENV de l'image),
# ce qui casserait le healthcheck (127.0.0.1:3000). On la force donc au runtime
# juste avant de lancer le serveur.
CMD ["sh", "-c", "HOSTNAME=0.0.0.0 exec node server.js"]
