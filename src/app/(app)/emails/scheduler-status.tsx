"use client";

import { useLocale, useTranslations } from "@/components/locale-provider";
import { Card } from "@/components/ui";
import { dayNameCapitalized, formatDateFr, fromDateInput } from "@/lib/date";
import type { Locale } from "@/lib/i18n";

export type SchedulerSlotView = {
  id: string;
  dayOfWeek: number;
  sendTime: string;
  weekOffset: number;
  enabled: boolean;
  /** Date locale (YYYY-MM-DD) du prochain declenchement. */
  nextDateKey: string | null;
  nextWeek: { weekYear: number; weekNumber: number } | null;
  lastSentAt: string | null;
  lastSentStatus: string | null;
  lastSentPartial: boolean;
};

export type SchedulerStatusView = {
  timezone: string;
  enabled: boolean;
  lastTickAt: string | null;
  lastTickStatus: string | null;
  /** Le dernier passage du worker est recent (calcule cote serveur). */
  fresh: boolean;
  slots: SchedulerSlotView[];
};

/** Fraicheur (minutes) en dessous de laquelle le worker est considere vivant. */
export const FRESH_MINUTES = 10;

function formatInstant(iso: string, timezone: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", {
      timeZone: timezone,
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function SchedulerStatus({ status }: { status: SchedulerStatusView }) {
  const t = useTranslations();
  const locale = useLocale();

  const lastTick = status.lastTickAt ? new Date(status.lastTickAt) : null;
  const fresh = status.fresh;

  const badgeClass = !lastTick
    ? "bg-slate-100 text-slate-600"
    : fresh
      ? "bg-emerald-100 text-emerald-700"
      : "bg-amber-100 text-amber-700";
  const badgeLabel = !lastTick
    ? t("Aucun passage enregistre")
    : fresh
      ? t("Service planificateur actif")
      : t("Service planificateur inactif");

  return (
    <Card className="p-6">
      <h2 className="mb-4 text-base font-semibold text-slate-800">{t("Planificateur email")}</h2>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${badgeClass}`}>
          {badgeLabel}
        </span>
        <span>
          {status.enabled ? t("Envoi automatique actif") : t("Envoi automatique desactive")}
        </span>
        <span className="text-slate-400">
          {lastTick
            ? t("Dernier controle : {date}", {
                date: formatInstant(status.lastTickAt as string, status.timezone, locale),
              })
            : t("Aucun passage enregistre. Le service worker n'est peut-etre pas demarre.")}
        </span>
      </div>
      {status.slots.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {status.slots.map((slot) => (
            <li
              key={slot.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
            >
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-slate-700">
                  {slot.enabled ? null : (
                    <span className="mr-2 rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
                      {t("Creneau desactive")}
                    </span>
                  )}
                  {weekdayLabel(slot.dayOfWeek, locale)} {slot.sendTime}
                </span>
                <span className="rounded bg-sky-100 px-2 py-0.5 text-xs text-sky-700">
                  {slot.weekOffset === 0 ? t("Semaine en cours") : t("Semaine suivante")}
                </span>
              </span>
              <span className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                <span>
                  <span className="text-slate-400">{t("Prochain envoi")} : </span>
                  {slot.nextDateKey && slot.enabled
                    ? `${dayNameCapitalized(fromDateInput(slot.nextDateKey), locale)} ${formatDateFr(
                        fromDateInput(slot.nextDateKey),
                      )} ${slot.sendTime}`
                    : "—"}
                  {slot.nextWeek && slot.enabled
                    ? ` (${t("Semaine {week}/{year}", {
                        week: slot.nextWeek.weekNumber,
                        year: slot.nextWeek.weekYear,
                      })})`
                    : ""}
                </span>
                <span>
                  <span className="text-slate-400">{t("Dernier envoi automatique")} : </span>
                  {slot.lastSentAt
                    ? `${formatInstant(slot.lastSentAt, status.timezone, locale)}${
                        slot.lastSentStatus === "SUCCESS" ? "" : ` (${t("Erreur")})`
                      }`
                    : t("Jamais")}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">{t("Aucun creneau programme.")}</p>
      )}
    </Card>
  );
}

function weekdayLabel(dayOfWeek: number, locale: Locale): string {
  const base = fromDateInput("2026-03-01");
  const date = new Date(base.getTime() + (((dayOfWeek % 7) + 7) % 7) * 86400000);
  return dayNameCapitalized(date, locale);
}
