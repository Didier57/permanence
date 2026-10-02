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
RUN npm install --omit=dev --no-audit --no-fund \
  && npm cache clean --force

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
RUN ln -sf ../worker_modules/node_modules/tsx ./node_modules/tsx \
  && ln -sf ../worker_modules/node_modules/esbuild ./node_modules/esbuild \
  && ln -sf ../worker_modules/node_modules/.bin/tsx ./node_modules/.bin/tsx

RUN chmod +x ./docker/entrypoint.sh && chown -R node:node /app
USER node

EXPOSE 3000

ENTRYPOINT ["./docker/entrypoint.sh"]
CMD ["node", "server.js"]
