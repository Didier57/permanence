ALTER TABLE "groups" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

UPDATE "groups" AS g
SET "position" = ordered.rn - 1
FROM (
  SELECT "id", row_number() OVER (ORDER BY "name" ASC) AS rn
  FROM "groups"
) AS ordered
WHERE g."id" = ordered."id";
