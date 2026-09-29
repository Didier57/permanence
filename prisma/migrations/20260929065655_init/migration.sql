-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "SmtpEncryption" AS ENUM ('NONE', 'STARTTLS', 'SSL');

-- CreateEnum
CREATE TYPE "EmailSendType" AS ENUM ('AUTOMATIC', 'MANUAL', 'RESEND_AFTER_CHANGE');

-- CreateEnum
CREATE TYPE "EmailSendStatus" AS ENUM ('SUCCESS', 'ERROR');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "pro_phone" TEXT,
    "private_phone" TEXT,
    "email" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_groups" (
    "user_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_groups_pkey" PRIMARY KEY ("user_id","group_id")
);

-- CreateTable
CREATE TABLE "permanences" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "week_year" INTEGER NOT NULL,
    "week_number" INTEGER NOT NULL,
    "user_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "permanences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "user_id" TEXT,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "user_agent" TEXT,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_configuration" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "smtp_host" TEXT NOT NULL,
    "smtp_port" INTEGER NOT NULL,
    "smtp_encryption" "SmtpEncryption" NOT NULL DEFAULT 'STARTTLS',
    "smtp_user" TEXT,
    "smtp_password_encrypted" TEXT,
    "from_address" TEXT NOT NULL,
    "from_name" TEXT,
    "reply_to" TEXT,
    "cc_recipients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "send_day_of_week" INTEGER NOT NULL DEFAULT 3,
    "send_time" TEXT NOT NULL DEFAULT '09:00',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Paris',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_configuration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planning_versions" (
    "id" TEXT NOT NULL,
    "week_year" INTEGER NOT NULL,
    "week_number" INTEGER NOT NULL,
    "week_start" DATE NOT NULL,
    "week_end" DATE NOT NULL,
    "snapshot" JSONB NOT NULL,
    "content_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "planning_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_history" (
    "id" TEXT NOT NULL,
    "week_year" INTEGER NOT NULL,
    "week_number" INTEGER NOT NULL,
    "week_start" DATE NOT NULL,
    "week_end" DATE NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "EmailSendType" NOT NULL DEFAULT 'MANUAL',
    "recipients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cc_recipients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "EmailSendStatus" NOT NULL DEFAULT 'SUCCESS',
    "error" TEXT,
    "content_hash" TEXT,
    "planning_version_id" TEXT,
    "sent_by_account_id" TEXT,

    CONSTRAINT "email_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_last_name_first_name_idx" ON "users"("last_name", "first_name");

-- CreateIndex
CREATE UNIQUE INDEX "groups_name_key" ON "groups"("name");

-- CreateIndex
CREATE INDEX "permanences_date_idx" ON "permanences"("date");

-- CreateIndex
CREATE INDEX "permanences_user_id_idx" ON "permanences"("user_id");

-- CreateIndex
CREATE INDEX "permanences_week_year_week_number_idx" ON "permanences"("week_year", "week_number");

-- CreateIndex
CREATE UNIQUE INDEX "permanences_date_group_id_key" ON "permanences"("date", "group_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_email_key" ON "accounts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_user_id_key" ON "accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_account_id_idx" ON "sessions"("account_id");

-- CreateIndex
CREATE INDEX "planning_versions_week_year_week_number_idx" ON "planning_versions"("week_year", "week_number");

-- CreateIndex
CREATE INDEX "email_history_week_year_week_number_idx" ON "email_history"("week_year", "week_number");

-- AddForeignKey
ALTER TABLE "user_groups" ADD CONSTRAINT "user_groups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_groups" ADD CONSTRAINT "user_groups_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permanences" ADD CONSTRAINT "permanences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permanences" ADD CONSTRAINT "permanences_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permanences" ADD CONSTRAINT "permanences_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permanences" ADD CONSTRAINT "permanences_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_history" ADD CONSTRAINT "email_history_planning_version_id_fkey" FOREIGN KEY ("planning_version_id") REFERENCES "planning_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_history" ADD CONSTRAINT "email_history_sent_by_account_id_fkey" FOREIGN KEY ("sent_by_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
