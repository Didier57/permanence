-- Lien public unique et partage par tous les creneaux CALLCENTER.
-- Table a une seule ligne (id = 'callcenter').
CREATE TABLE "public_links" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "previous_token" TEXT,
    "previous_expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "public_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "public_links_token_key" ON "public_links"("token");

-- Reprend le jeton public d'un creneau CALLCENTER existant comme jeton global,
-- afin de ne pas casser les liens deja distribues.
INSERT INTO "public_links" ("id", "token", "updated_at")
SELECT 'callcenter', "public_token", CURRENT_TIMESTAMP
FROM "email_schedules"
WHERE "kind" = 'CALLCENTER' AND "public_token" IS NOT NULL
ORDER BY "created_at" ASC
LIMIT 1;
