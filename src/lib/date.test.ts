import { describe, expect, it } from "vitest";
import {
  addDays,
  formatWeekRangeShortFr,
  getISOWeekInfo,
  isoWeekRange,
  isoWeekStart,
  startOfISOWeek,
  weekDays,
} from "./date";

describe("getISOWeekInfo", () => {
  it("place le 1er janvier 2026 (jeudi) en semaine 1 de 2026", () => {
    expect(getISOWeekInfo(new Date(Date.UTC(2026, 0, 1)))).toEqual({ weekYear: 2026, weekNumber: 1 });
  });

  it("rattache le lundi 29/12/2025 a la semaine 1 de 2026", () => {
    expect(getISOWeekInfo(new Date(Date.UTC(2025, 11, 29)))).toEqual({ weekYear: 2026, weekNumber: 1 });
  });

  it("rattache le 01/01/2027 (vendredi) a la semaine 53 de 2026", () => {
    expect(getISOWeekInfo(new Date(Date.UTC(2027, 0, 1)))).toEqual({ weekYear: 2026, weekNumber: 53 });
  });

  it("retourne la semaine 42 pour le 13/10/2026", () => {
    expect(getISOWeekInfo(new Date(Date.UTC(2026, 9, 13)))).toEqual({ weekYear: 2026, weekNumber: 42 });
  });
});

describe("bornes de semaine ISO", () => {
  it("startOfISOWeek renvoie le lundi", () => {
    expect(startOfISOWeek(new Date(Date.UTC(2026, 9, 14))).toISOString().slice(0, 10)).toBe("2026-10-12");
  });

  it("isoWeekRange(2026, 42) = lundi 12/10 au dimanche 18/10", () => {
    const { start, end } = isoWeekRange(2026, 42);
    expect(start.toISOString().slice(0, 10)).toBe("2026-10-12");
    expect(end.toISOString().slice(0, 10)).toBe("2026-10-18");
  });

  it("une semaine a cheval sur deux mois reste une seule semaine", () => {
    const { start, end } = isoWeekRange(2026, 40);
    expect(start.toISOString().slice(0, 10)).toBe("2026-09-28");
    expect(end.toISOString().slice(0, 10)).toBe("2026-10-04");
  });

  it("isoWeekStart(2026, 1) renvoie le lundi 29/12/2025", () => {
    expect(isoWeekStart(2026, 1).toISOString().slice(0, 10)).toBe("2025-12-29");
  });

  it("weekDays retourne 7 jours consecutifs", () => {
    const days = weekDays(isoWeekStart(2026, 42));
    expect(days).toHaveLength(7);
    expect(days[0].toISOString().slice(0, 10)).toBe("2026-10-12");
    expect(days[6].toISOString().slice(0, 10)).toBe("2026-10-18");
    expect(addDays(days[0], 1).toISOString().slice(0, 10)).toBe("2026-10-13");
  });
});

describe("formatage francais", () => {
  it("formate la periode courte de la semaine", () => {
    const { start, end } = isoWeekRange(2026, 42);
    expect(formatWeekRangeShortFr(start, end)).toBe("Du 12/10/2026 au 18/10/2026");
  });
});
