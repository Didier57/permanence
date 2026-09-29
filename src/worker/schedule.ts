import { addDays, dateKey, fromDateInput, getISOWeekInfo } from "@/lib/date";

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
  /** 0 : semaine en cours au jour d'envoi, 1 : semaine suivante (defaut). */
  weekOffset?: number;
};

export type ScheduleDecision =
  | { status: "disabled" }
  | { status: "invalid-time" }
  | { status: "not-due" }
  | { status: "due"; weekYear: number; weekNumber: number };

export type SlotOccurrence = {
  /** Date locale (YYYY-MM-DD) du declenchement le plus proche. */
  dateKey: string;
  hour: number;
  minute: number;
  /**
   * Minutes ecoulees depuis ce declenchement le plus proche :
   * 0 = a l'instant prevu, negatif = declenchement encore a venir.
   */
  offsetMinutes: number;
};

/**
 * Declenchement le plus proche d'un creneau, exprime dans le fuseau configure.
 * Le calcul reste en heure locale (mur) : les changements d'heure n'ont aucune
 * incidence sur le jour et l'heure choisis.
 */
export function slotOccurrence(
  slot: { dayOfWeek: number; sendTime: string },
  timezone: string,
  reference: Date,
): SlotOccurrence | null {
  const send = parseSendTime(slot.sendTime);
  if (!send) return null;

  const zoned = getZonedParts(reference, timezone);
  const currentMinuteOfDay = zoned.hour * 60 + zoned.minute;
  const scheduledMinuteOfDay = send.hour * 60 + send.minute;
  const dayGap = (((slot.dayOfWeek % 7) + 7) % 7) - zoned.weekday + 7;
  let offsetMinutes = (dayGap % 7) * 1440 + (scheduledMinuteOfDay - currentMinuteOfDay);
  if (offsetMinutes > 5040) offsetMinutes -= 10080;

  const dayOffset = Math.floor((currentMinuteOfDay + offsetMinutes) / 1440);
  const localDate = new Date(Date.UTC(zoned.year, zoned.month - 1, zoned.day));
  return {
    dateKey: dateKey(addDays(localDate, dayOffset)),
    hour: send.hour,
    minute: send.minute,
    offsetMinutes,
  };
}

/**
 * Determine si l'envoi automatique doit se declencher maintenant pour le
 * creneau fourni, ainsi que la semaine visee : la semaine suivante par defaut,
 * ou la semaine en cours du jour d'envoi lorsque `weekOffset` vaut 0.
 */
export function decideSchedule(config: ScheduleConfig, reference: Date): ScheduleDecision {
  if (!config.enabled) return { status: "disabled" };

  const occurrence = slotOccurrence(
    { dayOfWeek: config.sendDayOfWeek, sendTime: config.sendTime },
    config.timezone,
    reference,
  );
  if (!occurrence) return { status: "invalid-time" };
  if (occurrence.offsetMinutes !== 0) return { status: "not-due" };

  return {
    status: "due",
    ...targetWeek(occurrence.dateKey, config.weekOffset ?? 1),
  };
}

/** Semaine visee pour un declenchement tombe a la date locale fournie. */
export function targetWeek(
  dateKey: string,
  weekOffset: number,
): { weekYear: number; weekNumber: number } {
  const { weekYear, weekNumber } = getISOWeekInfo(addDays(fromDateInput(dateKey), 7 * weekOffset));
  return { weekYear, weekNumber };
}

/**
 * Prochain declenchement d'un creneau, jamais dans le passe : lorsque le
 * declenchement le plus proche est deja tombe, on passe a la semaine suivante.
 */
export function nextSlotDateKey(
  slot: { dayOfWeek: number; sendTime: string },
  timezone: string,
  reference: Date,
): string | null {
  const occurrence = slotOccurrence(slot, timezone, reference);
  if (!occurrence) return null;
  const base = fromDateInput(occurrence.dateKey);
  return dateKey(occurrence.offsetMinutes >= 0 ? base : addDays(base, 7));
}

export type ScheduleSlot = {
  id: string;
  dayOfWeek: number;
  sendTime: string;
  weekOffset: number;
  enabled: boolean;
};

export type DueSlot = { id: string; weekYear: number; weekNumber: number };

/** Fenetre de rattrapage par defaut (minutes) appliquee au demarrage du worker. */
export const DEFAULT_CATCH_UP_MINUTES = 720;

/**
 * Liste les creneaux a traiter pour l'instant fourni. Chaque creneau est
 * independant : deux creneaux peuvent viser la meme semaine.
 */
export function findDueSlots(
  slots: ScheduleSlot[],
  config: { enabled: boolean; timezone: string },
  reference: Date,
): DueSlot[] {
  return selectSlots(slots, config, reference, (offsetMinutes) => offsetMinutes === 0);
}

/**
 * Creneaux dont le declenchement a ete manque depuis moins de `windowMinutes`.
 * Utilise au demarrage du worker : un redemarrage (ou une coupure) juste apres
 * l'heure prevue ne doit pas faire perdre l'envoi de la semaine.
 */
export function findMissedSlots(
  slots: ScheduleSlot[],
  config: { enabled: boolean; timezone: string },
  reference: Date,
  windowMinutes: number = DEFAULT_CATCH_UP_MINUTES,
): DueSlot[] {
  return selectSlots(
    slots,
    config,
    reference,
    (offsetMinutes) => offsetMinutes < 0 && -offsetMinutes <= windowMinutes,
  );
}

function selectSlots(
  slots: ScheduleSlot[],
  config: { enabled: boolean; timezone: string },
  reference: Date,
  matches: (offsetMinutes: number) => boolean,
): DueSlot[] {
  if (!config.enabled) return [];

  const due: DueSlot[] = [];
  for (const slot of slots) {
    if (!slot.enabled) continue;
    const occurrence = slotOccurrence(slot, config.timezone, reference);
    if (!occurrence || !matches(occurrence.offsetMinutes)) continue;
    due.push({ id: slot.id, ...targetWeek(occurrence.dateKey, slot.weekOffset) });
  }
  return due;
}
