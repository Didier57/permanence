-- CreateTable
CREATE TABLE "app_configuration" (
    "id" TEXT NOT NULL,
    "app_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_configuration_pkey" PRIMARY KEY ("id")
);
