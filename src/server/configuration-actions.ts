"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { normalizeAppUrl, normalizeEmail, normalizeTimezone } from "./services/app-config";

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
  callCenterEmail: z
    .string()
    .trim()
    .max(320)
    .refine(
      (value) => value === "" || z.string().email().safeParse(value).success,
      "Adresse email invalide.",
    ),
  timezone: z.string().trim().min(1, "Le fuseau horaire est requis").max(100),
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
    callCenterEmail: formData.get("callCenterEmail") ?? "",
    timezone: (formData.get("timezone") as string) || "Europe/Paris",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Adresse invalide." };
  }

  const appUrl = normalizeAppUrl(parsed.data.appUrl);
  const callCenterEmail = normalizeEmail(parsed.data.callCenterEmail);
  const timezone = normalizeTimezone(parsed.data.timezone) ?? "Europe/Paris";

  await prisma.appConfiguration.upsert({
    where: { id: "default" },
    create: { id: "default", appUrl, callCenterEmail, timezone },
    update: { appUrl, callCenterEmail, timezone },
  });

  logger.info({ configured: appUrl !== null }, "app.configuration.saved");
  revalidatePath("/administration/configuration");
  revalidatePath("/emails");

  return {
    ok: true,
    message: "Configuration enregistree.",
  };
}
