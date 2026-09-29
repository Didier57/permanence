# Configuration

## Variables d'environnement

| Variable | Obligatoire | Description |
| --- | --- | --- |
| `DATABASE_URL` | oui | Chaine de connexion PostgreSQL. En Docker Compose, l'hote est `db`. |
| `APP_SECRET` | oui | Secret (>= 16 caracteres) utilise pour le chiffrement du mot de passe SMTP et divers jetons. |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | oui | Cle stable pour les Server Actions Next.js (identique sur toutes les instances). |
| `TIMEZONE` | non | Fuseau du planificateur (defaut `Europe/Paris`). |
| `LOG_LEVEL` | non | Niveau de log pino (defaut `info`, `silent` en test). |
| `ADMIN_EMAIL` | non | Email du compte admin cree au premier demarrage. |
| `ADMIN_PASSWORD` | non | Mot de passe du compte admin cree au premier demarrage. |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | non | Identifiants de la base dans `docker-compose.yml`. |
| `APP_PORT` | non | Port HTTP expose (defaut `3000`). |
| `RUN_MIGRATIONS`, `RUN_SEED` | non | Controle l'application des migrations et du seed par l'entrypoint (`true` pour `app`). |

Aucune variable d'environnement SMTP : la configuration SMTP se fait uniquement dans l'interface (menu **Emails**).

## Configuration SMTP

Dans l'application : menu **Emails**.

- Serveur SMTP, port, chiffrement (`Aucun`, `STARTTLS`, `SSL`), utilisateur et mot de passe.
- Adresse d'expedition, nom d'expedition, adresse de reponse.
- Destinataires en copie (CC), separes par des virgules.
- Jour d'envoi, heure d'envoi, activation de l'envoi automatique.
- Bouton **Tester la configuration SMTP** : envoie un email de test et affiche un message clair.

Le mot de passe SMTP est chiffre (AES-256-GCM) avant stockage et n'est **jamais** reaffiche en clair
apres enregistrement. Laisser le champ vide conserve le mot de passe existant.

## Envoi automatique

Le conteneur `worker` verifie chaque minute la configuration. Si l'envoi automatique est active et
que l'heure locale (fuseau `TIMEZONE`) correspond au jour et a l'heure configures, il envoie la
planification de la **semaine ISO suivante** aux personnes concernees (une seule fois par semaine).

## Roles et droits

- `ADMIN` : acces complet (planning, personnel, groupes, emails/SMTP, configuration, historique).
- `USER` : acces en lecture seule au planning.

Un compte `ADMIN` peut egalement etre rattache a une fiche du personnel afin d'apparaitre dans le planning.
Les comptes sont geres dans le menu **Configuration**.
