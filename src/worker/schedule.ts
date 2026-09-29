import { addDays, getISOWeekInfo } from "@/lib/date";

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
};

/** Extrait les composantes locales (fuseau configure) d'un instant donne. */
export function getZonedParts(reference: Date, timezone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  });
  const lookup: Record<string, string> = {};
  for (const part of formatter.formatToParts(reference)) {
    lookup[part.type] = part.value;
  }
  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
    hour: Number(lookup.hour),
    minute: Number(lookup.minute),
    weekday: WEEKDAY_INDEX[lookup.weekday ?? ""] ?? 0,
  };
}

/** Valide et decode une heure au format HH:MM. */
export function parseSendTime(sendTime: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(sendTime.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

export type ScheduleConfig = {
  enabled: boolean;
  timezone: string;
  sendDayOfWeek: number;
  sendTime: string;
};

export type ScheduleDecision =
  | { status: "disabled" }
  | { status: "invalid-time" }
  | { status: "not-due" }
  | { status: "due"; weekYear: number; weekNumber: number };

/**
 * Determine si l'envoi automatique doit se declencher pour l'instant fourni,
 * ainsi que la semaine visee : la SEMAINE SUIVANTE (regle du cahier des charges).
 */
export function decideSchedule(config: ScheduleConfig, reference: Date): ScheduleDecision {
  if (!config.enabled) return { status: "disabled" };

  const send = parseSendTime(config.sendTime);
  if (!send) return { status: "invalid-time" };

  const zoned = getZonedParts(reference, config.timezone);
  if (zoned.weekday !== config.sendDayOfWeek) return { status: "not-due" };
  if (zoned.hour !== send.hour || zoned.minute !== send.minute) return { status: "not-due" };

  const localDate = new Date(Date.UTC(zoned.year, zoned.month - 1, zoned.day));
  const { weekYear, weekNumber } = getISOWeekInfo(addDays(localDate, 7));
  return { status: "due", weekYear, weekNumber };
}
