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

3. Demarrer la pile (l'image est telechargee depuis GHCR, aucune compilation sur le serveur) :

   ```bash
   docker compose pull
   docker compose up -d
   ```

   Trois services sont lances :
   - `db` : PostgreSQL 16, donnees persistees dans le volume nomme `db_data` ;
   - `app` : application web (applique les migrations et le seed au demarrage) ;
   - `worker` : planificateur d'envoi automatique des emails.

   > Le fichier `docker-compose.yml` ne contient volontairement aucune section `build` :
   > il fonctionne avec le seul fichier `.env` et l'image GHCR, sans code source.

4. Ouvrir http://localhost:3000 (ou le port defini par `APP_PORT`) et se connecter avec
   le compte administrateur cree par le seed (`ADMIN_EMAIL` / `ADMIN_PASSWORD`).

> En production, l'acces doit se faire derriere un reverse proxy HTTPS (nginx, Caddy, Traefik...).

## Developpement local

Construire l'image localement (necessite le code source et le `Dockerfile`) :

```bash
docker compose -f docker-compose.yml -f docker-compose.build.yml up -d --build
```

Ou sans Docker :

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

## Depannage : "Identifiants invalides" a la connexion

Le compte administrateur est cree au premier demarrage par le seed, a partir de
`ADMIN_EMAIL` / `ADMIN_PASSWORD`. Si la connexion echoue :

1. Verifier que le seed s'est bien execute :

   ```bash
   docker compose logs app | grep -i "compte admin"
   ```

2. Si la base a ete creee avec d'anciennes valeurs, re-executer le seed (il
   re-aligne le mot de passe admin sur `ADMIN_PASSWORD`, sauf si
   `ADMIN_SYNC_PASSWORD=false`) :

   ```bash
   docker compose exec app worker_modules/node_modules/.bin/prisma db seed
   ```

3. Pour repartir d'une base vierge (donnees supprimees) :

   ```bash
   docker compose down -v
   docker compose up -d
   ```

> Dans un fichier `.env`, un mot de passe contenant `$` doit etre ecrit `$$`
> (Docker Compose interprete `$` comme une variable dans le `docker-compose.yml`).

## Sans Docker : base PostgreSQL locale

Definir `DATABASE_URL` vers une base PostgreSQL accessible, puis executer
`npx prisma migrate deploy` pour preparer le schema.
