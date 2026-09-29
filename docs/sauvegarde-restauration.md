# Sauvegarde et restauration

Les donnees sont stockees dans PostgreSQL, persistees dans le volume Docker nomme `db_data`
(elles survivent au remplacement des conteneurs).

## Sauvegarde

Un script est fourni : `scripts/backup.sh`.

```bash
POSTGRES_USER=permanence POSTGRES_DB=permanence ./scripts/backup.sh ./backups
```

Il execute un `pg_dump` dans le conteneur `db` et ecrit un fichier horodate
`permanence-AAAAMMJJ-HHMMSS.sql.gz`. Plusieurs sauvegardes peuvent etre conservees.

Exemple de planification quotidienne (crontab du serveur) :

```
0 3 * * * cd /srv/permanence && ./scripts/backup.sh /srv/permanence/backups >> /var/log/permanence-backup.log 2>&1
```

Une retention peut etre ajoutee, par exemple pour ne conserver que les 30 derniers fichiers :

```bash
ls -1t /srv/permanence/backups/permanence-*.sql.gz | tail -n +31 | xargs -r rm --
```

## Restauration

```bash
./scripts/restore.sh /srv/permanence/backups/permanence-20260929-030000.sql.gz
```

Le script arrete les services applicatifs, restaure la base, puis les redemarre.

> La restauration remplace integralement le contenu actuel de la base.

## Sauvegarde applicative (JSON)

Independamment du dump PostgreSQL, les administrateurs disposent du menu **Sauvegarde** qui exporte un
fichier `permanence-backup-AAAAMMJJ.json` contenant le **personnel**, les **comptes d'acces** (empreinte
des mots de passe, role, etat, activation), les **groupes** et leurs membres, le **planning**, la
**configuration email** (mot de passe SMTP chiffre inclus), l'**adresse du site** et ses reglages.
L'historique des emails, les sessions et les liens d'activation en cours ne sont pas inclus.

> L'empreinte des mots de passe est incluse pour qu'une reinstallation complete sur un autre serveur
> conserve les mots de passe existants. L'empreinte argon2id est portable (elle contient son sel et ses
> parametres) et **n'est pas reversible** ; le fichier de sauvegarde doit toutefois etre conserve dans un
> emplacement protege, car il permet des tentatives de devinette hors ligne.

Ce format permet de reimporter les donnees via l'interface (page **Sauvegarde**) :

- **Mise a jour** : chaque enregistrement du fichier est ajoute ou mis a jour, sans supprimer le reste.
- **Restauration complete** : le personnel, les groupes et le planning actuels sont supprimes avant l'import
  (confirmation demandee). Les comptes d'acces existants sont rattaches a nouveau aux personnes lorsque
  leur email correspond.

Dans les deux modes, les comptes d'acces du fichier sont crees ou mis a jour (mot de passe, role, etat)
mais **aucun compte existant n'est supprime** : l'administrateur qui effectue la restauration ne peut pas
se retrouver enferme dehors. La restauration est refusee si elle ne laisse aucun administrateur actif.

Comme le mot de passe SMTP est chiffre avec `APP_SECRET`, il n'est reutilisable que si le serveur de
restauration utilise le **meme** `APP_SECRET` ; dans le cas contraire, ressaisissez le mot de passe SMTP
dans le menu **Emails**.

Le dump PostgreSQL reste la reference pour une restauration a l'identique de toute la base
(comptes, sessions, historique des emails).

## Conservation recommandee

Combiner les deux approches : dump PostgreSQL quotidien (restauration technique complete) et export
JSON applicatif avant toute operation importante (reprise selective des referentiels et du planning).
