# Permanence

Application web de gestion des permanences (gardes / astreintes) par groupe et par jour,
avec planning hebdomadaire et mensuel, glisser-deposer, planification des envois par email
et suivi des versions envoyees.

## Fonctionnalites

- **Authentification** par email + mot de passe, sessions securisees, roles `ADMIN` et `USER`.
- **Personnel** : fiche complete (nom, prenom, telephones, email), recherche, filtre, appartenance a plusieurs groupes.
- **Groupes** : nom, description, couleur, membres, CRUD complet.
- **Planning** conforme aux **semaines ISO 8601** (lundi premier jour) :
  - vue **Semaine** avec numero de semaine et navigation semaine precedente / suivante / courante ;
  - vue **Mois** avec le numero de semaine de chaque ligne ;
  - **glisser-deposer** d'un utilisateur vers un jour (remplacement automatique si deja occupe) ;
  - depot sur une **semaine entiere** en vue Mois (remplit les 7 jours, avec confirmation de remplacement).
- **Emails** : configuration SMTP, bouton de test, generation HTML + texte du planning complet
  de la semaine, destinataires dedupliques, CC, envoi manuel.
- **Envoi automatique** : un conteneur `worker` declenche l'envoi hebdomadaire (jour et heure configurables)
  de la planification de la **semaine suivante**.
- **Version de planning** : l'application compare la version envoyee a la version courante et propose
  un renvoi lorsque le planning a ete modifie apres l'envoi.
- **Historique** de chaque envoi (date, semaine, type, destinataires, CC, statut, erreur, version).

## Architecture

```
Navigateur -> Application web (Next.js) -> PostgreSQL
                      |
                      +--> Service SMTP
                      +--> Worker (planification des envois)
```

- Framework : **Next.js 16** (App Router, Server Actions), **React 19**, **TypeScript**, **Tailwind CSS 4**.
- Base de donnees : **PostgreSQL 16** via **Prisma 7**.
- Glisser-deposer : **dnd-kit**. Dates/semaines : **date-fns** et utilitaires ISO maison.
- Emails : **Nodemailer**. Planification : **node-cron** dans un conteneur dedie.
- Securite : mots de passe **argon2id**, chiffrement **AES-256-GCM** du mot de passe SMTP,
  validation **Zod**, en-tetes de securite et sessions par cookie HttpOnly.

## Demarrage rapide (Docker)

```bash
cp .env.example .env      # puis renseigner APP_SECRET et NEXT_SERVER_ACTIONS_ENCRYPTION_KEY
docker compose up -d
```

L'application est disponible sur http://localhost:3000 et le compte administrateur est cree
automatiquement au premier demarrage a partir de `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

## Developpement local

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

## Qualite

```bash
npm run lint        # ESLint
npm run typecheck   # TypeScript
npm test            # Vitest
npm run build       # Build de production
```

## Documentation

- [Installation](docs/installation.md)
- [Configuration (variables d'environnement et SMTP)](docs/configuration.md)
- [Utilisation](docs/utilisation.md)
- [Sauvegarde et restauration](docs/sauvegarde-restauration.md)
- [Mise a jour en production](docs/mise-a-jour.md)

## Modele de donnees

`User`, `Group`, `UserGroup`, `Permanence`, `Account`, `Session`, `EmailConfiguration`,
`EmailHistory`, `PlanningVersion` (voir `prisma/schema.prisma`).

La **planification affichee dans l'application est la source de verite** ; les emails envoyes
sont des instantanes. L'application compare l'instantané envoye a la version courante pour
detecter les modifications posterieures a un envoi.
