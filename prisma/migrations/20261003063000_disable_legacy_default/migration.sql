-- Desactive le creneau residuel issu de la migration 20260929160000_email_schedules.
-- Ce creneau (samedi 06:20) reste en base pour conserver l'historique mais ne doit
-- plus declencher d'envoi automatique une fois des creneaux personnalises crees.
UPDATE "email_schedules"
SET "enabled" = false, "updated_at" = CURRENT_TIMESTAMP
WHERE "id" = 'legacy-default';
