import { decryptSecret } from "@/lib/crypto";
import {
  addDays,
  dateKey,
  dayNameCapitalized,
  formatDateFr,
  fromDateInput,
  rangeConnector,
  toUTCDateOnly,
} from "@/lib/date";
import type { Locale } from "@/lib/i18n";
import { resolveLocale } from "@/lib/i18n";
import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { htmlToPlainText, sanitizeRichText } from "@/lib/html";
import { selectRecipients } from "@/lib/recipients";
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

function telHref(value: string): string {
  return `tel:${value.replace(/[^+0-9]/g, "")}`;
}

export type BuiltEmail = {
  subject: string;
  text: string;
  html: string;
  recipients: string[];
};

type DayRange = { start: number; end: number; entry: PlanningEntry };

function compressDays(days: (PlanningEntry | undefined)[]): DayRange[] {
  const ranges: DayRange[] = [];
  days.forEach((entry, index) => {
    if (!entry) return;
    const last = ranges[ranges.length - 1];
    if (last && last.end === index - 1 && last.entry.userId === entry.userId) {
      last.end = index;
      return;
    }
    ranges.push({ start: index, end: index, entry });
  });
  return ranges;
}

function rangeLabel(days: Date[], start: number, end: number, locale: Locale): string {
  const first = dayNameCapitalized(days[start], locale);
  if (start === end) return first;
  return `${first} ${rangeConnector(locale)} ${dayNameCapitalized(days[end], locale)}`;
}

type EmailStrings = {
  title: string;
  week: (weekNumber: number, start: string, end: string) => string;
  proPhoneLabel: string;
  privatePhoneLabel: string;
  proPhoneShort: string;
  privatePhoneShort: string;
  emailLabel: string;
  subject: (weekNumber: number, start: string, end: string, suffix: string) => string;
};

const EMAIL_STRINGS: Record<Locale, EmailStrings> = {
  fr: {
    title: "Planning des permanences",
    week: (weekNumber, start, end) => `Semaine ${weekNumber} du ${start} au ${end}`,
    proPhoneLabel: "Téléphone professionnel",
    privatePhoneLabel: "Téléphone privé",
    proPhoneShort: "Tél. pro",
    privatePhoneShort: "Tél. privé",
    emailLabel: "Email",
    subject: (weekNumber, start, end, suffix) =>
      `Permanence semaine ${weekNumber} du ${start} à ${end}${suffix}`,
  },
  en: {
    title: "On-call schedule",
    week: (weekNumber, start, end) => `Week ${weekNumber} from ${start} to ${end}`,
    proPhoneLabel: "Work phone",
    privatePhoneLabel: "Private phone",
    proPhoneShort: "Work",
    privatePhoneShort: "Private",
    emailLabel: "Email",
    subject: (weekNumber, start, end, suffix) =>
      `On-call schedule week ${weekNumber} from ${start} to ${end}${suffix}`,
  },
};

export function buildWeekEmail(
  snapshot: WeekSnapshot,
  options?: {
    isUpdate?: boolean;
    introHtml?: string | null;
    outroHtml?: string | null;
    locale?: Locale;
  },
): BuiltEmail {
  const locale: Locale = options?.locale ?? "fr";
  const strings = EMAIL_STRINGS[locale];
  const start = fromDateInput(snapshot.weekStart);
  const end = fromDateInput(snapshot.weekEnd);
  const startText = formatDateFr(start);
  const endText = formatDateFr(end);
  const suffix = options?.isUpdate ? " (UPDATE)" : "";
  const subject = strings.subject(snapshot.weekNumber, startText, endText, suffix);

  const introHtml = options?.introHtml ? sanitizeRichText(options.introHtml) : null;
  const outroHtml = options?.outroHtml ? sanitizeRichText(options.outroHtml) : null;

  const weekStart = fromDateInput(snapshot.weekStart);
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const dayKeys = days.map((day) => dateKey(day));

  const groupIds = [...new Set(snapshot.entries.map((entry) => entry.groupId))];
  const groups = groupIds
    .map((groupId) => {
      const entries = snapshot.entries.filter((entry) => entry.groupId === groupId);
      const byDate = new Map(entries.map((entry) => [entry.date, entry]));
      return {
        groupName: entries[0]?.groupName ?? "",
        groupDescription: entries[0]?.groupDescription ?? null,
        position: entries[0]?.groupPosition ?? 0,
        ranges: compressDays(dayKeys.map((key) => byDate.get(key))),
      };
    })
    .sort((a, b) => a.position - b.position || a.groupName.localeCompare(b.groupName, "fr"));

  let text = `${strings.title}\n`;
  text += `${strings.week(snapshot.weekNumber, startText, endText)}\n\n`;
  if (introHtml) {
    text += `${htmlToPlainText(introHtml)}\n\n`;
  }

  let html = `<!DOCTYPE html><html lang="${locale}"><head><meta charset="utf-8"><title>${escapeHtml(subject)}</title>`;
  html += `<style>@media print{@page{size:A4 portrait;margin:8mm;}body{margin:0;}table{font-size:10px !important;}}</style>`;
  html += `</head><body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.35;color:#0f172a;">`;
  html += `<div style="max-width:780px;">`;
  html += `<h1 style="font-size:17px;margin:0 0 3px;">${strings.title}</h1>`;
  html += `<p style="margin:0 0 8px;font-size:13px;"><strong>${strings.week(snapshot.weekNumber, startText, endText)}</strong></p>`;
  if (introHtml) {
    html += `<div style="margin:8px 0;font-size:12px;">${introHtml}</div>`;
  }

  for (const group of groups) {
    const groupTitle = group.groupDescription
      ? `${group.groupName} (${group.groupDescription})`
      : group.groupName;
    text += `${groupTitle}\n`;
    html += `<div style="page-break-inside:avoid;">`;
    html += `<h2 style="font-size:13px;margin:8px 0 2px;page-break-after:avoid;">${escapeHtml(groupTitle)}</h2>`;
    html += `<table style="border-collapse:collapse;width:100%;font-size:12px;table-layout:fixed;">`;
    html += `<colgroup><col style="width:130px;"><col></colgroup>`;
    for (const range of group.ranges) {
      const label = rangeLabel(days, range.start, range.end, locale);
      const proPhone = range.entry.userProPhone;
      const privatePhone = range.entry.userPrivatePhone;
      const phoneLink = (value: string) =>
        `<a href="${telHref(value)}" style="color:#0369a1;text-decoration:none;">${escapeHtml(value)}</a>`;
      const proCell = proPhone ? phoneLink(proPhone) : "—";
      const privateCell = privatePhone ? phoneLink(privatePhone) : "—";
      const emailCell = range.entry.userEmail
        ? `<a href="mailto:${escapeHtml(range.entry.userEmail)}" style="color:#0369a1;text-decoration:none;">${escapeHtml(range.entry.userEmail)}</a>`
        : "—";
      text += `${label} : ${range.entry.userName} — ${strings.emailLabel} : ${range.entry.userEmail}`;
      text += ` — ${strings.proPhoneLabel} : ${proPhone ?? "—"} — ${strings.privatePhoneLabel} : ${privatePhone ?? "—"}\n`;
      html += `<tr>`;
      html += `<td style="border:1px solid #e2e8f0;padding:2px 6px;vertical-align:top;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(label)}</td>`;
      html += `<td style="border:1px solid #e2e8f0;padding:2px 6px;vertical-align:top;">`;
      html += `<div><strong>${escapeHtml(range.entry.userName)}</strong> — ${strings.emailLabel} : ${emailCell}</div>`;
      html += `<div style="color:#475569;">${strings.proPhoneShort} : ${proCell} — ${strings.privatePhoneShort} : ${privateCell}</div>`;
      html += `</td>`;
      html += `</tr>`;
    }
    html += `</table></div>`;
    text += `\n`;
  }

  if (outroHtml) {
    text += `${htmlToPlainText(outroHtml)}\n\n`;
    html += `<div style="margin:8px 0;font-size:12px;">${outroHtml}</div>`;
  }

  html += `</div></body></html>`;

  const recipients = [...new Set(snapshot.entries.map((entry) => entry.userEmail))].filter(Boolean);

  return { subject, text, html, recipients };
}

export type SendResult = {
  ok: boolean;
  error?: string;
  recipientCount?: number;
  partial?: boolean;
  weekYear?: number;
  weekNumber?: number;
};

export async function sendWeekEmail(options: {
  weekYear: number;
  weekNumber: number;
  type: SendType;
  accountId?: string | null;
  scheduleId?: string | null;
  /**
   * Sous-ensemble de destinataires (adresses email). `null`/absent = envoi a
   * toutes les personnes concernees par la semaine.
   */
  recipients?: string[] | null;
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

  const concerned = [
    ...new Set(snapshot.entries.map((entry) => entry.userEmail)),
  ].filter(Boolean);
  if (concerned.length === 0) {
    return { ok: false, error: "Aucun destinataire identifié." };
  }

  const selection = selectRecipients(concerned, options.recipients);
  if (!selection) {
    return { ok: false, error: "Aucun destinataire selectionne pour cet envoi." };
  }
  const recipients = selection.recipients;

  const users = await prisma.user.findMany({
    where: { email: { in: recipients } },
    select: { email: true, locale: true },
  });
  const localeByEmail = new Map(users.map((user) => [user.email, resolveLocale(user.locale)]));
  const builtByLocale = new Map<Locale, BuiltEmail>();
  const introHtml = config.introHtml;
  const outroHtml = config.outroHtml;
  function emailForLocale(locale: Locale): BuiltEmail {
    const cached = builtByLocale.get(locale);
    if (cached) return cached;
    const built = buildWeekEmail(snapshot, {
      isUpdate: options.type === "RESEND_AFTER_CHANGE",
      introHtml,
      outroHtml,
      locale,
    });
    builtByLocale.set(locale, built);
    return built;
  }

  const from = formatFromAddress(config.fromAddress, config.fromName);
  const cc = config.ccRecipients.filter(Boolean);
  const weekStart = fromDateInput(snapshot.weekStart);
  const weekEnd = fromDateInput(snapshot.weekEnd);
  const contentHash = snapshotHash(snapshot);
  const transport = createTransport(settings);

  try {
    for (const recipient of recipients) {
      const email = emailForLocale(localeByEmail.get(recipient) ?? "fr");
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
        recipients,
        ccRecipients: cc,
        status: "SUCCESS",
        partial: selection.partial,
        contentHash,
        planningVersionId: version.id,
        sentByAccountId: options.accountId ?? null,
        scheduleId: options.scheduleId ?? null,
      },
    });

    logger.info(
      {
        weekYear: options.weekYear,
        weekNumber: options.weekNumber,
        recipients: recipients.length,
        type: options.type,
        partial: selection.partial,
      },
      "email.sent",
    );

    return {
      ok: true,
      recipientCount: recipients.length,
      partial: selection.partial,
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
        recipients,
        ccRecipients: cc,
        status: "ERROR",
        error: message,
        partial: selection.partial,
        contentHash,
        sentByAccountId: options.accountId ?? null,
        scheduleId: options.scheduleId ?? null,
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

const ACCOUNT_EMAIL_STRINGS: Record<
  Locale,
  {
    subjectActivation: string;
    subjectReset: string;
    hello: (name: string | null) => string;
    leadActivation: string;
    leadReset: string;
    ctaActivation: string;
    ctaReset: string;
    leadLineActivation: string;
    leadLineReset: string;
    copyLine: string;
    validUntil: (expiry: string) => string;
    footer: string;
  }
> = {
  fr: {
    subjectActivation: "Activation de votre compte Permanence",
    subjectReset: "Reinitialisation de votre mot de passe Permanence",
    hello: (name) => (name ? `Bonjour ${name},` : "Bonjour,"),
    leadActivation: "Un compte a ete cree pour vous sur l'application de gestion des permanences.",
    leadReset: "Une reinitialisation de votre mot de passe a ete demandee.",
    ctaActivation: "Activer mon compte",
    ctaReset: "Definir un nouveau mot de passe",
    leadLineActivation: "Pour activer votre compte, cliquez sur ce lien :",
    leadLineReset: "Pour reinitialiser votre mot de passe, cliquez sur ce lien :",
    copyLine: "Ou copiez ce lien dans votre navigateur :",
    validUntil: (expiry) => `Ce lien est valable jusqu'au ${expiry}.`,
    footer: "Si vous n'etes pas a l'origine de cette demande, ignorez cet email.",
  },
  en: {
    subjectActivation: "Activate your Permanence account",
    subjectReset: "Reset your Permanence password",
    hello: (name) => (name ? `Hello ${name},` : "Hello,"),
    leadActivation: "An account has been created for you on the on-call scheduling application.",
    leadReset: "A password reset has been requested for your account.",
    ctaActivation: "Activate my account",
    ctaReset: "Set a new password",
    leadLineActivation: "To activate your account, click this link:",
    leadLineReset: "To reset your password, click this link:",
    copyLine: "Or copy this link into your browser:",
    validUntil: (expiry) => `This link is valid until ${expiry}.`,
    footer: "If you did not request this, you can ignore this email.",
  },
};

export function buildAccountEmail(options: {
  kind: AccountEmailKind;
  name?: string | null;
  url: string;
  expiresAt: Date;
  locale?: Locale;
}): BuiltEmail {
  const locale: Locale = options.locale ?? "fr";
  const strings = ACCOUNT_EMAIL_STRINGS[locale];
  const activation = options.kind === "ACTIVATION";
  const subject = activation ? strings.subjectActivation : strings.subjectReset;
  const greeting = strings.hello(options.name ?? null);
  const lead = activation ? strings.leadActivation : strings.leadReset;
  const cta = activation ? strings.ctaActivation : strings.ctaReset;
  const leadLine = activation ? strings.leadLineActivation : strings.leadLineReset;
  const expiry = formatDateFr(toUTCDateOnly(options.expiresAt));

  const text = [
    greeting,
    "",
    lead,
    "",
    leadLine,
    options.url,
    "",
    strings.validUntil(expiry),
    "",
    strings.footer,
  ].join("\n");

  const html = [
    "<!DOCTYPE html>",
    `<html lang="${locale}"><body style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;line-height:1.5">`,
    `<p>${escapeHtml(greeting)}</p>`,
    `<p>${escapeHtml(lead)}</p>`,
    `<p style="margin:24px 0"><a href="${options.url}" style="background:#0f172a;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">${escapeHtml(cta)}</a></p>`,
    `<p>${escapeHtml(strings.copyLine)}<br /><a href="${options.url}">${escapeHtml(options.url)}</a></p>`,
    `<p>${escapeHtml(strings.validUntil(expiry))}</p>`,
    `<p>${escapeHtml(strings.footer)}</p>`,
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
  locale?: Locale;
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
