# Mise a jour en production

Le serveur de production n'a **jamais** besoin du code source ni d'outils de compilation :
il ne lui faut que Docker et Docker Compose.

## Procedure

1. Pousser les modifications sur la branche `main` du depot GitHub :

   ```bash
   git push
   ```

2. GitHub Actions execute le lint, la verification des types, les tests, puis construit et publie
   l'image Docker sur GHCR (`ghcr.io/didier57/permanence:latest`).

3. Sur le serveur :

   ```bash
   docker compose pull
   docker compose up -d
   ```

   L'entrypoint du conteneur `app` applique automatiquement les migrations Prisma au demarrage.

## Retour arriere

Chaque build est egalement publie avec un tag base sur le commit (`sha-<court>`). Pour revenir a une
version precedente, fixer ce tag dans `docker-compose.yml` (champ `image:`) puis relancer :

```bash
docker compose pull
docker compose up -d
```
