"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { normalizeAppUrl } from "./services/app-config";

export type AppConfigurationActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
};

const schema = z.object({
  appUrl: z
    .string()
    .trim()
    .max(255)
    .refine(
      (value) => value === "" || /^https?:\/\/[^\s/]+\.[^\s/]+/i.test(value),
      "Adresse invalide. Utilisez le format https://exemple.fr",
    ),
});

export async function saveAppConfiguration(
  _prev: AppConfigurationActionState,
  formData: FormData,
): Promise<AppConfigurationActionState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Acces refuse." };
  }

  const parsed = schema.safeParse({
    appUrl: formData.get("appUrl") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Adresse invalide." };
  }

  const appUrl = normalizeAppUrl(parsed.data.appUrl);

  await prisma.appConfiguration.upsert({
    where: { id: "default" },
    create: { id: "default", appUrl },
    update: { appUrl },
  });

  logger.info({ configured: appUrl !== null }, "app.configuration.saved");
  revalidatePath("/administration/configuration");

  return {
    ok: true,
    message: appUrl
      ? "Adresse du site enregistree."
      : "Adresse du site reinitialisee (valeur par defaut).",
  };
}
