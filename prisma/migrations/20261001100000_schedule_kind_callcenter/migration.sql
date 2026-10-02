-- CreateEnum
CREATE TYPE "EmailScheduleKind" AS ENUM ('PERSONNEL', 'CALLCENTER');

-- AlterTable
ALTER TABLE "email_schedules"
ADD COLUMN "kind" "EmailScheduleKind" NOT NULL DEFAULT 'PERSONNEL',
ADD COLUMN "extra_recipients" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "public_token" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "email_schedules_public_token_key" ON "email_schedules"("public_token");

-- AlterTable
ALTER TABLE "email_history" ADD COLUMN "kind" "EmailScheduleKind" NOT NULL DEFAULT 'PERSONNEL';
