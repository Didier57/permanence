"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentAccount, requireAdmin, requireManager } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";
import { fromDateInput, getISOWeekInfo } from "@/lib/date";
import { prisma } from "@/lib/db";
import { sanitizeRichText } from "@/lib/html";
import { logger } from "@/lib/logger";
import { emailAddress as emailAddressSchema, parseRecipients } from "@/lib/recipients";
import { sendTestEmail, sendWeekEmail } from "./services/email";

export type EmailActionState = { ok?: boolean; error?: string; message?: string };

const emailAddress = emailAddressSchema;

const sendTimeSchema = z.string().regex(/^\d{2}:\d{2}$/, "Heure invalide (HH:MM)");

const configSchema = z.object({
  smtpHost: z.string().trim().min(1, "Le serveur SMTP est requis").max(255),
  smtpPort: z.coerce.number().int().min(1, "Port invalide").max(65535),
  smtpEncryption: z.enum(["NONE", "STARTTLS", "SSL"]),
  smtpUser: z.string().trim().max(255).optional(),
  fromAddress: emailAddress,
  fromName: z.string().trim().max(150).optional(),
  replyTo: z.string().trim().optional(),
  timezone: z.string().trim().min(1).max(100),
  enabled: z.boolean(),
  introHtml: z.string().max(50000).optional(),
  outroHtml: z.string().max(50000).optional(),
});

const scheduleSchema = z.object({
  id: z.string().trim().max(64).optional(),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  sendTime: sendTimeSchema,
  weekOffset: z.coerce.number().int().min(0).max(1).default(1),
  enabled: z.boolean().default(true),
});

/** Decode la liste des creneaux transmise en JSON par le formulaire. */
function parseSchedules(raw: FormDataEntryValue | null): z.infer<typeof scheduleSchema>[] | null {
  if (typeof raw !== "string" || raw.trim() === "") return [];
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(json)) return null;
  const parsed = z.array(scheduleSchema).safeParse(json);
  return parsed.success ? parsed.data : null;
}

export async function saveEmailConfiguration(
  _prev: EmailActionState,
  formData: FormData,
): Promise<EmailActionState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Acces refuse." };
  }

  const parsed = configSchema.safeParse({
    smtpHost: formData.get("smtpHost"),
    smtpPort: formData.get("smtpPort"),
    smtpEncryption: formData.get("smtpEncryption") ?? "STARTTLS",
    smtpUser: formData.get("smtpUser") ?? undefined,
    fromAddress: formData.get("fromAddress"),
    fromName: formData.get("fromName") ?? undefined,
    replyTo: formData.get("replyTo") ?? undefined,
    timezone: (formData.get("timezone") as string) || "Europe/Paris",
    enabled: formData.get("enabled") === "on",
    introHtml: formData.get("introHtml") ?? undefined,
    outroHtml: formData.get("outroHtml") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Donnees invalides." };
  }

  const schedules = parseSchedules(formData.get("schedules"));
  if (schedules === null) {
    return { error: "Creneaux d'envoi invalides." };
  }
  if (formData.get("enabled") === "on" && schedules.length === 0) {
    return { error: "Ajoutez au moins un creneau d'envoi." };
  }

  const data = parsed.data;
  const replyToRaw = data.replyTo?.trim();
  if (replyToRaw && !emailAddress.safeParse(replyToRaw).success) {
    return { error: "Adresse de reponse invalide." };
  }

  const ccRecipients = parseRecipients(
    formData.getAll("ccRecipients").map((value) => String(value)).join(" "),
  );

  const existing = await prisma.emailConfiguration.findUnique({ where: { id: "default" } });
  const rawPassword = formData.get("smtpPassword")?.toString() ?? "";
  let smtpPasswordEncrypted = existing?.smtpPasswordEncrypted ?? null;
  if (rawPassword.trim().length > 0) {
    smtpPasswordEncrypted = encryptSecret(rawPassword);
  } else if (formData.get("clearPassword") === "on") {
    smtpPasswordEncrypted = null;
  }

  const payload = {
    smtpHost: data.smtpHost,
    smtpPort: data.smtpPort,
    smtpEncryption: data.smtpEncryption,
    smtpUser: data.smtpUser?.trim() ? data.smtpUser.trim() : null,
    smtpPasswordEncrypted,
    fromAddress: data.fromAddress,
    fromName: data.fromName?.trim() ? data.fromName.trim() : null,
    replyTo: replyToRaw || null,
    ccRecipients,
    timezone: data.timezone,
    enabled: data.enabled,
    introHtml: data.introHtml ? sanitizeRichText(data.introHtml) : null,
    outroHtml: data.outroHtml ? sanitizeRichText(data.outroHtml) : null,
  };

  await prisma.$transaction(async (tx) => {
    await tx.emailConfiguration.upsert({
      where: { id: "default" },
      create: { id: "default", ...payload },
      update: payload,
    });

    const keptIds: string[] = [];
    for (const slot of schedules) {
      const slotData = {
        dayOfWeek: slot.dayOfWeek,
        sendTime: slot.sendTime,
        weekOffset: slot.weekOffset,
        enabled: slot.enabled,
      };
      const known = slot.id
        ? await tx.emailSchedule.findUnique({ where: { id: slot.id }, select: { id: true } })
        : null;
      if (known) {
        await tx.emailSchedule.update({ where: { id: known.id }, data: slotData });
        keptIds.push(known.id);
      } else {
        const created = await tx.emailSchedule.create({ data: slotData, select: { id: true } });
        keptIds.push(created.id);
      }
    }
    await tx.emailSchedule.deleteMany(
      keptIds.length > 0 ? { where: { id: { notIn: keptIds } } } : undefined,
    );
  });

  logger.info(
    { enabled: payload.enabled, host: payload.smtpHost, schedules: schedules.length },
    "email.config.saved",
  );
  revalidatePath("/emails");
  return { ok: true, message: "Configuration SMTP enregistree." };
}

export async function testEmailConfiguration(
  _prev: EmailActionState,
  formData: FormData,
): Promise<EmailActionState> {
  let account;
  try {
    account = await requireAdmin();
  } catch {
    return { error: "Acces refuse." };
  }

  const toRaw = formData.get("testRecipient")?.toString().trim();
  const to = toRaw && emailAddress.safeParse(toRaw).success ? toRaw : account.email;

  const result = await sendTestEmail(to);
  if (!result.ok) {
    return { error: result.error ?? "Echec du test." };
  }
  return { ok: true, message: `Email de test envoye a ${to}.` };
}

const weekSchema = z.object({
  weekYear: z.coerce.number().int().min(2000).max(2100),
  weekNumber: z.coerce.number().int().min(1).max(53),
});

export async function sendWeekEmailNow(input: {
  weekYear: number;
  weekNumber: number;
}): Promise<{ ok: boolean; error?: string; message?: string }> {
  let account;
  try {
    account = await requireManager();
  } catch {
    return { ok: false, error: "Acces refuse." };
  }

  const parsed = weekSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Semaine invalide." };

  const result = await sendWeekEmail({
    weekYear: parsed.data.weekYear,
    weekNumber: parsed.data.weekNumber,
    type: "MANUAL",
    accountId: account.id,
  });
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/historique");
  revalidatePath("/planning");
  return {
    ok: true,
    message: `Planning de la semaine ${parsed.data.weekNumber} envoye a ${result.recipientCount} destinataire(s).`,
  };
}

export async function resendWeekEmail(input: {
  weekYear: number;
  weekNumber: number;
}): Promise<{ ok: boolean; error?: string; message?: string }> {
  let account;
  try {
    account = await requireManager();
  } catch {
    return { ok: false, error: "Acces refuse." };
  }

  const parsed = weekSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Semaine invalide." };

  const result = await sendWeekEmail({
    weekYear: parsed.data.weekYear,
    weekNumber: parsed.data.weekNumber,
    type: "RESEND_AFTER_CHANGE",
    accountId: account.id,
  });
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/historique");
  revalidatePath("/planning");
  return {
    ok: true,
    message: `Planning mis a jour de la semaine ${parsed.data.weekNumber} renvoye a ${result.recipientCount} destinataire(s).`,
  };
}

export async function sendWeekEmailForDate(
  _prev: EmailActionState,
  formData: FormData,
): Promise<EmailActionState> {
  try {
    await requireManager();
  } catch {
    return { error: "Acces refuse." };
  }

  const dateRaw = formData.get("date")?.toString() ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
    return { error: "Date invalide." };
  }

  const account = await getCurrentAccount();
  const { weekYear, weekNumber } = getISOWeekInfo(fromDateInput(dateRaw));
  const result = await sendWeekEmail({
    weekYear,
    weekNumber,
    type: "MANUAL",
    accountId: account?.id ?? null,
  });
  if (!result.ok) return { error: result.error };

  revalidatePath("/historique");
  revalidatePath("/planning");
  return {
    ok: true,
    message: `Planning de la semaine ${weekNumber} envoye a ${result.recipientCount} destinataire(s).`,
  };
}
