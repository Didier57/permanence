# Installation

## Prerequis

- **Docker** et **Docker Compose** (serveur de production : rien d'autre, aucune compilation locale).
- Pour le developpement : **Node.js 24** (>= 20.9) et **npm**.

## Installation en production

1. Recuperer le fichier `docker-compose.yml` et creer un fichier `.env` a cote :

   ```bash
   cp .env.example .env
   ```

2. Renseigner au minimum `APP_SECRET` et `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` :

   ```bash
   openssl rand -hex 32                                          # APP_SECRET
   openssl rand -base64 32                                       # NEXT_SERVER_ACTIONS_ENCRYPTION_KEY
   ```

3. Demarrer la pile :

   ```bash
   docker compose up -d
   ```

   Trois services sont lances :
   - `db` : PostgreSQL 16, donnees persistees dans le volume nomme `db_data` ;
   - `app` : application web (applique les migrations et le seed au demarrage) ;
   - `worker` : planificateur d'envoi automatique des emails.

4. Ouvrir http://localhost:3000 (ou le port defini par `APP_PORT`) et se connecter avec
   le compte administrateur cree par le seed (`ADMIN_EMAIL` / `ADMIN_PASSWORD`).

> En production, l'acces doit se faire derriere un reverse proxy HTTPS (nginx, Caddy, Traefik...).

## Developpement local

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

Pour lancer uniquement le planificateur en local :

```bash
npm run worker        # boucle chaque minute
npm run worker:once   # un seul cycle (utile pour tester)
```

## Sans Docker : base PostgreSQL locale

Definir `DATABASE_URL` vers une base PostgreSQL accessible, puis executer
`npx prisma migrate deploy` pour preparer le schema.
