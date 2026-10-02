"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentAccount, requireAdmin, requireManager } from "@/lib/auth";
import { encryptSecret, generateToken } from "@/lib/crypto";
import { fromDateInput, getISOWeekInfo } from "@/lib/date";
import { prisma } from "@/lib/db";
import { sanitizeRichText } from "@/lib/html";
import { logger } from "@/lib/logger";
import { emailAddress as emailAddressSchema, parseRecipients } from "@/lib/recipients";
import { sendTestEmail, sendWeekEmail } from "./services/email";
import { getWeekSnapshot } from "./services/planning";

export type EmailActionState = { ok?: boolean; error?: string; message?: string };

const emailAddress = emailAddressSchema;

const sendTimeSchema = z.string().regex(/^\d{2}:\d{2}$/, "Heure invalide (HH:MM)");

/** Jeton public non devinable pour le lien CallCenter. */
function generatePublicToken(): string {
  return generateToken(24);
}

const smtpSchema = z.object({
  smtpHost: z.string().trim().min(1, "Le serveur SMTP est requis").max(255),
  smtpPort: z.coerce.number().int().min(1, "Port invalide").max(65535),
  smtpEncryption: z.enum(["NONE", "STARTTLS", "SSL"]),
  smtpUser: z.string().trim().max(255).optional(),
  fromAddress: emailAddress,
  fromName: z.string().trim().max(150).optional(),
  replyTo: z.string().trim().optional(),
});

const schedulingSchema = z.object({
  timezone: z.string().trim().min(1).max(100),
  enabled: z.boolean(),
  introHtml: z.string().max(50000).optional(),
  outroHtml: z.string().max(50000).optional(),
});

const scheduleSchema = z.object({
  id: z.string().trim().max(64).optional(),
  kind: z.enum(["PERSONNEL", "CALLCENTER"]).default("PERSONNEL"),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  sendTime: sendTimeSchema,
  weekOffset: z.coerce.number().int().min(0).max(1).default(1),
  enabled: z.boolean().default(true),
  extraRecipients: z.array(emailAddress).max(500).default([]),
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

export async function saveSmtpConfiguration(
  _prev: EmailActionState,
  formData: FormData,
): Promise<EmailActionState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Acces refuse." };
  }

  const parsed = smtpSchema.safeParse({
    smtpHost: formData.get("smtpHost"),
    smtpPort: formData.get("smtpPort"),
    smtpEncryption: formData.get("smtpEncryption") ?? "STARTTLS",
    smtpUser: formData.get("smtpUser") ?? undefined,
    fromAddress: formData.get("fromAddress"),
    fromName: formData.get("fromName") ?? undefined,
    replyTo: formData.get("replyTo") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Donnees invalides." };
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
  };

  if (existing) {
    await prisma.emailConfiguration.update({ where: { id: "default" }, data: payload });
  } else {
    await prisma.emailConfiguration.create({
      data: {
        id: "default",
        ...payload,
        timezone: "Europe/Paris",
        enabled: false,
        introHtml: null,
        outroHtml: null,
      },
    });
  }

  logger.info({ host: payload.smtpHost }, "email.smtp.saved");
  revalidatePath("/administration/smtp");
  return { ok: true, message: "Configuration SMTP enregistree." };
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

  const parsed = schedulingSchema.safeParse({
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
  const payload = {
    timezone: data.timezone,
    enabled: data.enabled,
    introHtml: data.introHtml ? sanitizeRichText(data.introHtml) : null,
    outroHtml: data.outroHtml ? sanitizeRichText(data.outroHtml) : null,
  };

  await prisma.$transaction(async (tx) => {
    const existing = await tx.emailConfiguration.findUnique({ where: { id: "default" } });
    if (existing) {
      await tx.emailConfiguration.update({ where: { id: "default" }, data: payload });
    } else {
      await tx.emailConfiguration.create({
        data: {
          id: "default",
          ...payload,
          smtpHost: "",
          smtpPort: 587,
          smtpEncryption: "STARTTLS",
          fromAddress: "",
          ccRecipients: [],
        },
      });
    }

    const keptIds: string[] = [];
    for (const slot of schedules) {
      const kind = slot.kind;
      const extraRecipients = [...new Set(slot.extraRecipients.map((value) => value.trim()).filter(Boolean))];
      const existingSlot = slot.id
        ? await tx.emailSchedule.findUnique({
            where: { id: slot.id },
            select: { id: true, publicToken: true },
          })
        : null;
      const publicToken =
        kind === "CALLCENTER"
          ? (existingSlot?.publicToken ?? generatePublicToken())
          : null;
      const slotData = {
        kind,
        dayOfWeek: slot.dayOfWeek,
        sendTime: slot.sendTime,
        weekOffset: slot.weekOffset,
        enabled: slot.enabled,
        extraRecipients,
        publicToken,
      };
      if (existingSlot) {
        await tx.emailSchedule.update({ where: { id: existingSlot.id }, data: slotData });
        keptIds.push(existingSlot.id);
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
    { enabled: payload.enabled, schedules: schedules.length },
    "email.scheduling.saved",
  );
  revalidatePath("/emails");
  return { ok: true, message: "Envois automatiques enregistres." };
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

const recipientsSchema = z.array(z.string().trim().max(320)).max(500).optional();

export type WeekSendResult = {
  ok: boolean;
  error?: string;
  recipientCount?: number;
  partial?: boolean;
};

export type WeekRecipient = { id: string; name: string; email: string };

export type WeekRecipientsResult = {
  ok: boolean;
  error?: string;
  recipients?: WeekRecipient[];
};

/** Liste des destinataires concernes par une semaine (pour le popup d'envoi). */
export async function previewWeekRecipients(input: {
  weekYear: number;
  weekNumber: number;
}): Promise<WeekRecipientsResult> {
  try {
    await requireManager();
  } catch {
    return { ok: false, error: "Acces refuse." };
  }

  const parsed = weekSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Semaine invalide." };

  const snapshot = await getWeekSnapshot(parsed.data.weekYear, parsed.data.weekNumber);
  if (snapshot.entries.length === 0) {
    return { ok: false, error: "Aucune permanence pour cette semaine." };
  }

  const byEmail = new Map<string, WeekRecipient>();
  for (const entry of snapshot.entries) {
    if (!entry.userEmail || byEmail.has(entry.userEmail)) continue;
    byEmail.set(entry.userEmail, {
      id: entry.userId,
      name: entry.userName,
      email: entry.userEmail,
    });
  }
  const recipients = [...byEmail.values()].sort((a, b) => a.name.localeCompare(b.name, "fr"));
  if (recipients.length === 0) {
    return { ok: false, error: "Aucun destinataire identifie." };
  }
  return { ok: true, recipients };
}

export async function sendWeekEmailNow(input: {
  weekYear: number;
  weekNumber: number;
  recipients?: string[] | null;
}): Promise<WeekSendResult> {
  let account;
  try {
    account = await requireManager();
  } catch {
    return { ok: false, error: "Acces refuse." };
  }

  const parsed = weekSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Semaine invalide." };
  const recipients = recipientsSchema.safeParse(input.recipients ?? undefined);
  if (!recipients.success) return { ok: false, error: "Destinataires invalides." };

  const result = await sendWeekEmail({
    weekYear: parsed.data.weekYear,
    weekNumber: parsed.data.weekNumber,
    type: "MANUAL",
    accountId: account.id,
    recipients: recipients.data ?? null,
  });
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/historique");
  revalidatePath("/planning");
  return { ok: true, recipientCount: result.recipientCount, partial: result.partial };
}

export async function resendWeekEmail(input: {
  weekYear: number;
  weekNumber: number;
  recipients?: string[] | null;
}): Promise<WeekSendResult> {
  let account;
  try {
    account = await requireManager();
  } catch {
    return { ok: false, error: "Acces refuse." };
  }

  const parsed = weekSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Semaine invalide." };
  const recipients = recipientsSchema.safeParse(input.recipients ?? undefined);
  if (!recipients.success) return { ok: false, error: "Destinataires invalides." };

  const result = await sendWeekEmail({
    weekYear: parsed.data.weekYear,
    weekNumber: parsed.data.weekNumber,
    type: "RESEND_AFTER_CHANGE",
    accountId: account.id,
    recipients: recipients.data ?? null,
  });
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/historique");
  revalidatePath("/planning");
  return { ok: true, recipientCount: result.recipientCount, partial: result.partial };
}

export async function sendWeekEmailForDate(input: {
  date: string;
  recipients?: string[] | null;
}): Promise<WeekSendResult> {
  try {
    await requireManager();
  } catch {
    return { ok: false, error: "Acces refuse." };
  }

  const dateRaw = typeof input.date === "string" ? input.date : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
    return { ok: false, error: "Date invalide." };
  }
  const recipients = recipientsSchema.safeParse(input.recipients ?? undefined);
  if (!recipients.success) return { ok: false, error: "Destinataires invalides." };

  const account = await getCurrentAccount();
  const { weekYear, weekNumber } = getISOWeekInfo(fromDateInput(dateRaw));
  const result = await sendWeekEmail({
    weekYear,
    weekNumber,
    type: "MANUAL",
    accountId: account?.id ?? null,
    recipients: recipients.data ?? null,
  });
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/historique");
  revalidatePath("/planning");
  return { ok: true, recipientCount: result.recipientCount, partial: result.partial };
}
