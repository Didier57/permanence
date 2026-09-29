-- CreateTable
CREATE TABLE "email_schedules" (
    "id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "send_time" TEXT NOT NULL,
    "week_offset" INTEGER NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_schedules_pkey" PRIMARY KEY ("id")
);

-- Reprise de l'ancien creneau unique comme premier creneau programme
INSERT INTO "email_schedules" ("id", "day_of_week", "send_time", "week_offset", "enabled", "created_at", "updated_at")
SELECT 'legacy-default', "send_day_of_week", "send_time", 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "email_configuration"
WHERE "id" = 'default';

-- AlterTable
ALTER TABLE "email_configuration" DROP COLUMN "send_day_of_week",
DROP COLUMN "send_time";

-- AlterTable
ALTER TABLE "email_history" ADD COLUMN "schedule_id" TEXT;

-- AddForeignKey
ALTER TABLE "email_history" ADD CONSTRAINT "email_history_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "email_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
