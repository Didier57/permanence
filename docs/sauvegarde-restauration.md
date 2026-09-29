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
