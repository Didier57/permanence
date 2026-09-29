import type { Locale } from "@/lib/i18n";

const MS_PER_DAY = 86_400_000;

const FRENCH_DAYS_LOWER = [
  "dimanche",
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
];

const FRENCH_DAYS_CAPITALIZED = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

const FRENCH_MONTHS = [
  "janvier",
  "fevrier",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "aout",
  "septembre",
  "octobre",
  "novembre",
  "decembre",
];

export function toUTCDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function fromDateInput(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function dateKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

export function getISOWeekInfo(date: Date): { weekYear: number; weekNumber: number } {
  const d = toUTCDateOnly(date);
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(((d.getTime() - yearStart.getTime()) / MS_PER_DAY + 1) / 7);
  return { weekYear: d.getUTCFullYear(), weekNumber };
}

export function startOfISOWeek(date: Date): Date {
  const d = toUTCDateOnly(date);
  const dayNum = d.getUTCDay() || 7;
  return addDays(d, -(dayNum - 1));
}

export function endOfISOWeek(date: Date): Date {
  return addDays(startOfISOWeek(date), 6);
}

export function isoWeekStart(weekYear: number, weekNumber: number): Date {
  const jan4 = new Date(Date.UTC(weekYear, 0, 4));
  return addDays(startOfISOWeek(jan4), (weekNumber - 1) * 7);
}

export function isoWeekRange(weekYear: number, weekNumber: number): { start: Date; end: Date } {
  const start = isoWeekStart(weekYear, weekNumber);
  return { start, end: addDays(start, 6) };
}

export function weekKey(weekYear: number, weekNumber: number): string {
  return `${weekYear}-W${String(weekNumber).padStart(2, "0")}`;
}

export function weekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function formatDateFr(date: Date): string {
  const d = String(date.getUTCDate()).padStart(2, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${d}/${m}/${date.getUTCFullYear()}`;
}

export function formatDayMonthFr(date: Date): string {
  const d = String(date.getUTCDate()).padStart(2, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${d}/${m}`;
}

export function dayNameFr(date: Date): string {
  return FRENCH_DAYS_LOWER[date.getUTCDay()];
}

export function dayNameFrCapitalized(date: Date): string {
  return FRENCH_DAYS_CAPITALIZED[date.getUTCDay()];
}

export function formatLongDateFr(date: Date): string {
  return `${dayNameFr(date)} ${date.getUTCDate()} ${FRENCH_MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function formatWeekRangeFr(start: Date, end: Date): string {
  return `Du ${formatLongDateFr(start)} au ${formatLongDateFr(end)}`;
}

export function formatWeekRangeShortFr(start: Date, end: Date): string {
  return `Du ${formatDateFr(start)} au ${formatDateFr(end)}`;
}

export function monthsInRange(start: Date, end: Date): { year: number; month: number }[] {
  const months: { year: number; month: number }[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  while (cursor.getTime() <= end.getTime()) {
    months.push({ year: cursor.getUTCFullYear(), month: cursor.getUTCMonth() });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
}

export function monthStart(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 1));
}

export function monthEnd(year: number, month: number): Date {
  return new Date(Date.UTC(year, month + 1, 0));
}

export function monthNameFr(month: number): string {
  return FRENCH_MONTHS[month];
}

/* ------------------------------------------------------------------ *
 * Variantes localisees (fr / en)
 * ------------------------------------------------------------------ */

const ENGLISH_DAYS_LOWER = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const ENGLISH_DAYS_CAPITALIZED = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const ENGLISH_MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

export function dayName(date: Date, locale: Locale = "fr"): string {
  return locale === "en"
    ? ENGLISH_DAYS_LOWER[date.getUTCDay()]
    : FRENCH_DAYS_LOWER[date.getUTCDay()];
}

export function dayNameCapitalized(date: Date, locale: Locale = "fr"): string {
  return locale === "en"
    ? ENGLISH_DAYS_CAPITALIZED[date.getUTCDay()]
    : FRENCH_DAYS_CAPITALIZED[date.getUTCDay()];
}

export function monthName(month: number, locale: Locale = "fr"): string {
  return locale === "en" ? ENGLISH_MONTHS[month] : FRENCH_MONTHS[month];
}

export function formatLongDate(date: Date, locale: Locale = "fr"): string {
  const month = monthName(date.getUTCMonth(), locale);
  if (locale === "en") {
    return `${dayNameCapitalized(date, locale)} ${date.getUTCDate()} ${month} ${date.getUTCFullYear()}`;
  }
  return `${dayName(date, locale)} ${date.getUTCDate()} ${month} ${date.getUTCFullYear()}`;
}

export function formatWeekRange(start: Date, end: Date, locale: Locale = "fr"): string {
  if (locale === "en") {
    return `From ${formatLongDate(start, locale)} to ${formatLongDate(end, locale)}`;
  }
  return `Du ${formatLongDate(start, locale)} au ${formatLongDate(end, locale)}`;
}

export function formatWeekRangeShort(start: Date, end: Date, locale: Locale = "fr"): string {
  if (locale === "en") {
    return `From ${formatDateFr(start)} to ${formatDateFr(end)}`;
  }
  return `Du ${formatDateFr(start)} au ${formatDateFr(end)}`;
}

export function rangeConnector(locale: Locale = "fr"): string {
  return locale === "en" ? "to" : "à";
}
