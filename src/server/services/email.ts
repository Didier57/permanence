import { decryptSecret } from "@/lib/crypto";
import { dateKey, dayNameFrCapitalized, formatDateFr, formatDayMonthFr, fromDateInput, toUTCDateOnly } from "@/lib/date";
import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import {
  createTransport,
  formatFromAddress,
  sendMail,
  verifyTransport,
  type SmtpEncryption,
  type SmtpSettings,
} from "@/lib/mailer";
import { getWeekSnapshot, snapshotHash, type PlanningEntry, type WeekSnapshot } from "./planning";

export type SendType = "AUTOMATIC" | "MANUAL" | "RESEND_AFTER_CHANGE";

export type EmailConfigRecord = Awaited<ReturnType<typeof getEmailConfig>>;

export async function getEmailConfig() {
  return prisma.emailConfiguration.findUnique({ where: { id: "default" } });
}

export function resolveSmtpSettings(config: {
  smtpHost: string;
  smtpPort: number;
  smtpEncryption: string;
  smtpUser: string | null;
  smtpPasswordEncrypted: string | null;
}): SmtpSettings {
  return {
    host: config.smtpHost,
    port: Number(config.smtpPort),
    encryption: config.smtpEncryption as SmtpEncryption,
    user: config.smtpUser,
    password: decryptSecret(config.smtpPasswordEncrypted),
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type BuiltEmail = {
  subject: string;
  text: string;
  html: string;
  recipients: string[];
};

export function buildWeekEmail(
  snapshot: WeekSnapshot,
  options?: { isUpdate?: boolean },
): BuiltEmail {
  const start = fromDateInput(snapshot.weekStart);
  const end = fromDateInput(snapshot.weekEnd);
  const suffix = options?.isUpdate ? " (UPDATE)" : "";
  const subject = `Permanence semaine ${snapshot.weekNumber} du ${formatDateFr(start)} à ${formatDateFr(end)}${suffix}`;

  const byDate = new Map<string, PlanningEntry[]>();
  for (const entry of snapshot.entries) {
    const list = byDate.get(entry.date) ?? [];
    list.push(entry);
    byDate.set(entry.date, list);
  }
  const sortedDates = [...byDate.keys()].sort();

  let text = `Planning des permanences\n`;
  text += `Semaine ${snapshot.weekNumber} du ${formatDateFr(start)} au ${formatDateFr(end)}\n\n`;

  let html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"></head><body style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;">`;
  html += `<h1 style="font-size:18px;">Planning des permanences</h1>`;
  html += `<p><strong>Semaine ${snapshot.weekNumber}</strong> du ${formatDateFr(start)} au ${formatDateFr(end)}</p>`;

  for (const date of sortedDates) {
    const day = fromDateInput(date);
    const entries = byDate.get(date) ?? [];
    text += `${dayNameFrCapitalized(day)} ${formatDayMonthFr(day)}\n`;
    html += `<h2 style="font-size:15px;margin-bottom:4px;">${escapeHtml(dayNameFrCapitalized(day))} ${escapeHtml(formatDayMonthFr(day))}</h2>`;
    html += `<table style="border-collapse:collapse;margin-bottom:12px;width:100%;">`;
    for (const entry of entries) {
      const phone = entry.userProPhone ?? entry.userPrivatePhone ?? "—";
      text += `Groupe : ${entry.groupName}\n`;
      text += `Utilisateur : ${entry.userName}\n`;
      text += `Téléphone : ${phone}\n`;
      text += `Email : ${entry.userEmail}\n\n`;
      html += `<tr>`;
      html += `<td style="border:1px solid #e2e8f0;padding:6px;vertical-align:top;white-space:nowrap;"><strong>${escapeHtml(entry.groupName)}</strong></td>`;
      html += `<td style="border:1px solid #e2e8f0;padding:6px;">${escapeHtml(entry.userName)}<br>`;
      html += `<span style="color:#64748b;">Tél. : ${escapeHtml(phone)}</span><br>`;
      html += `<span style="color:#64748b;">${escapeHtml(entry.userEmail)}</span></td>`;
      html += `</tr>`;
    }
    html += `</table>`;
    text += `\n`;
  }

  html += `</body></html>`;

  const recipients = [...new Set(snapshot.entries.map((entry) => entry.userEmail))].filter(Boolean);

  return { subject, text, html, recipients };
}

export type SendResult = {
  ok: boolean;
  error?: string;
  recipientCount?: number;
  weekYear?: number;
  weekNumber?: number;
};

export async function sendWeekEmail(options: {
  weekYear: number;
  weekNumber: number;
  type: SendType;
  accountId?: string | null;
}): Promise<SendResult> {
  const config = await getEmailConfig();
  if (!config) return { ok: false, error: "Aucune configuration SMTP enregistrée." };

  const settings = resolveSmtpSettings(config);
  if (!settings.host || !settings.port || !config.fromAddress) {
    return { ok: false, error: "Configuration SMTP incomplete." };
  }

  const snapshot = await getWeekSnapshot(options.weekYear, options.weekNumber);
  if (snapshot.entries.length === 0) {
    return { ok: false, error: "Aucune permanence pour cette semaine." };
  }

  const email = buildWeekEmail(snapshot, { isUpdate: options.type === "RESEND_AFTER_CHANGE" });
  if (email.recipients.length === 0) {
    return { ok: false, error: "Aucun destinataire identifié." };
  }

  const from = formatFromAddress(config.fromAddress, config.fromName);
  const cc = config.ccRecipients.filter(Boolean);
  const weekStart = fromDateInput(snapshot.weekStart);
  const weekEnd = fromDateInput(snapshot.weekEnd);
  const contentHash = snapshotHash(snapshot);
  const transport = createTransport(settings);

  try {
    for (const recipient of email.recipients) {
      await sendMail(transport, {
        from,
        to: recipient,
        cc,
        replyTo: config.replyTo ?? undefined,
        subject: email.subject,
        text: email.text,
        html: email.html,
      });
    }

    const version = await prisma.planningVersion.create({
      data: {
        weekYear: options.weekYear,
        weekNumber: options.weekNumber,
        weekStart,
        weekEnd,
        snapshot: snapshot as unknown as object,
        contentHash,
      },
    });

    await prisma.emailHistory.create({
      data: {
        weekYear: options.weekYear,
        weekNumber: options.weekNumber,
        weekStart,
        weekEnd,
        type: options.type,
        recipients: email.recipients,
        ccRecipients: cc,
        status: "SUCCESS",
        contentHash,
        planningVersionId: version.id,
        sentByAccountId: options.accountId ?? null,
      },
    });

    logger.info(
      {
        weekYear: options.weekYear,
        weekNumber: options.weekNumber,
        recipients: email.recipients.length,
        type: options.type,
      },
      "email.sent",
    );

    return {
      ok: true,
      recipientCount: email.recipients.length,
      weekYear: options.weekYear,
      weekNumber: options.weekNumber,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.emailHistory.create({
      data: {
        weekYear: options.weekYear,
        weekNumber: options.weekNumber,
        weekStart,
        weekEnd,
        type: options.type,
        recipients: email.recipients,
        ccRecipients: cc,
        status: "ERROR",
        error: message,
        contentHash,
        sentByAccountId: options.accountId ?? null,
      },
    });
    logger.error({ err: error, weekYear: options.weekYear, weekNumber: options.weekNumber }, "email.send.error");
    return { ok: false, error: `Echec de l'envoi : ${message}` };
  } finally {
    transport.close();
  }
}

export async function sendTestEmail(to: string): Promise<{ ok: boolean; error?: string }> {
  const config = await getEmailConfig();
  if (!config) return { ok: false, error: "Aucune configuration SMTP enregistrée." };

  const settings = resolveSmtpSettings(config);
  const transport = createTransport(settings);
  try {
    await verifyTransport(transport);
    await sendMail(transport, {
      from: formatFromAddress(config.fromAddress, config.fromName),
      to,
      replyTo: config.replyTo ?? undefined,
      subject: "Test de configuration SMTP - Permanence",
      text: "Ce message confirme que la configuration SMTP de l'application Permanence est fonctionnelle.",
      html: "<p>Ce message confirme que la configuration SMTP de l'application <strong>Permanence</strong> est fonctionnelle.</p>",
    });
    logger.info({ to }, "email.test.success");
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error({ err: error }, "email.test.error");
    return { ok: false, error: `Echec du test : ${message}` };
  } finally {
    transport.close();
  }
}

export type AccountEmailKind = "ACTIVATION" | "RESET";

export type AccountEmailResult = {
  ok: boolean;
  error?: string;
};

export function accountLinkPath(kind: AccountEmailKind): string {
  return kind === "ACTIVATION" ? "/activer" : "/reinitialiser";
}

export function buildAccountLinkUrl(
  token: string,
  kind: AccountEmailKind,
  baseUrl?: string,
): string {
  const base = (baseUrl ?? getEnv().APP_URL).replace(/\/+$/, "");
  return `${base}${accountLinkPath(kind)}?token=${encodeURIComponent(token)}`;
}

export function buildAccountEmail(options: {
  kind: AccountEmailKind;
  name?: string | null;
  url: string;
  expiresAt: Date;
}): BuiltEmail {
  const activation = options.kind === "ACTIVATION";
  const subject = activation
    ? "Activation de votre compte Permanence"
    : "Reinitialisation de votre mot de passe Permanence";
  const greeting = options.name ? `Bonjour ${options.name},` : "Bonjour,";
  const lead = activation
    ? "Un compte a ete cree pour vous sur l'application de gestion des permanences."
    : "Une reinitialisation de votre mot de passe a ete demandee.";
  const cta = activation ? "Activer mon compte" : "Definir un nouveau mot de passe";
  const expiry = formatDateFr(toUTCDateOnly(options.expiresAt));

  const text = [
    greeting,
    "",
    lead,
    "",
    `Pour ${activation ? "activer votre compte" : "reinitialiser votre mot de passe"}, cliquez sur ce lien :`,
    options.url,
    "",
    `Ce lien est valable jusqu'au ${expiry}.`,
    "",
    "Si vous n'etes pas a l'origine de cette demande, ignorez cet email.",
  ].join("\n");

  const html = [
    "<!DOCTYPE html>",
    '<html lang="fr"><body style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;line-height:1.5">',
    `<p>${escapeHtml(greeting)}</p>`,
    `<p>${escapeHtml(lead)}</p>`,
    `<p style="margin:24px 0"><a href="${options.url}" style="background:#0f172a;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">${escapeHtml(cta)}</a></p>`,
    `<p>Ou copiez ce lien dans votre navigateur :<br /><a href="${options.url}">${escapeHtml(options.url)}</a></p>`,
    `<p>Ce lien est valable jusqu'au ${expiry}.</p>`,
    "<p>Si vous n'etes pas a l'origine de cette demande, ignorez cet email.</p>",
    "</body></html>",
  ].join("\n");

  return { subject, text, html, recipients: [] };
}

export async function sendAccountEmail(options: {
  to: string;
  kind: AccountEmailKind;
  name?: string | null;
  url: string;
  expiresAt: Date;
}): Promise<AccountEmailResult> {
  const config = await getEmailConfig();
  if (!config || !config.smtpHost || !config.fromAddress) {
    return {
      ok: false,
      error: "Configuration SMTP non renseignee : l'email n'a pas pu etre envoye.",
    };
  }

  const settings = resolveSmtpSettings(config);
  const email = buildAccountEmail(options);
  const transport = createTransport(settings);
  try {
    await sendMail(transport, {
      from: formatFromAddress(config.fromAddress, config.fromName),
      to: options.to,
      replyTo: config.replyTo ?? undefined,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });
    logger.info({ to: options.to, kind: options.kind }, "account.email.sent");
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error({ err: error, kind: options.kind }, "account.email.error");
    return { ok: false, error: `Echec de l'envoi : ${message}` };
  } finally {
    transport.close();
  }
}

export async function getNextWeekReference(reference: Date, timezone: string): Promise<{ weekYear: number; weekNumber: number }> {
  void timezone;
  const { getISOWeekInfo, addDays } = await import("@/lib/date");
  return getISOWeekInfo(addDays(reference, 7));
}

export function currentWeekKey(weekYear: number, weekNumber: number): string {
  return `${weekYear}-${weekNumber}`;
}

export function entryDateKey(entry: PlanningEntry): string {
  return dateKey(fromDateInput(entry.date));
}
