-- Surveillance du worker de planification : derniere passe et son resultat.
ALTER TABLE "email_configuration" ADD COLUMN "last_tick_at" TIMESTAMP(3);
ALTER TABLE "email_configuration" ADD COLUMN "last_tick_status" TEXT;
