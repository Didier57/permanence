import { describe, expect, it } from "vitest";
import { decideSchedule, getZonedParts, parseSendTime } from "./schedule";

describe("parseSendTime", () => {
  it("accepte une heure valide", () => {
    expect(parseSendTime("09:00")).toEqual({ hour: 9, minute: 0 });
    expect(parseSendTime("9:05")).toEqual({ hour: 9, minute: 5 });
    expect(parseSendTime("23:59")).toEqual({ hour: 23, minute: 59 });
  });

  it("refuse une heure invalide", () => {
    expect(parseSendTime("24:00")).toBeNull();
    expect(parseSendTime("09:60")).toBeNull();
    expect(parseSendTime("09h00")).toBeNull();
    expect(parseSendTime("")).toBeNull();
  });
});

describe("getZonedParts", () => {
  it("applique le decalage d'ete de Paris", () => {
    const parts = getZonedParts(new Date("2026-07-15T07:00:00Z"), "Europe/Paris");
    expect(parts.hour).toBe(9);
    expect(parts.minute).toBe(0);
    expect(parts.weekday).toBe(3);
  });

  it("applique le decalage d'hiver de Paris", () => {
    const parts = getZonedParts(new Date("2026-01-15T08:00:00Z"), "Europe/Paris");
    expect(parts.hour).toBe(9);
    expect(parts.weekday).toBe(4);
  });

  it("respecte le fuseau UTC", () => {
    const parts = getZonedParts(new Date("2026-01-15T08:30:00Z"), "UTC");
    expect(parts.hour).toBe(8);
    expect(parts.minute).toBe(30);
  });
});

describe("decideSchedule", () => {
  const base = {
    enabled: true,
    timezone: "Europe/Paris",
    sendDayOfWeek: 3,
    sendTime: "09:00",
  };

  it("ne declenche rien si desactive", () => {
    expect(decideSchedule({ ...base, enabled: false }, new Date("2026-10-14T07:00:00Z"))).toEqual({
      status: "disabled",
    });
  });

  it("signale une heure invalide", () => {
    expect(decideSchedule({ ...base, sendTime: "99:99" }, new Date("2026-10-14T07:00:00Z"))).toEqual({
      status: "invalid-time",
    });
  });

  it("ne declenche rien un autre jour", () => {
    expect(decideSchedule(base, new Date("2026-10-15T07:00:00Z"))).toEqual({ status: "not-due" });
  });

  it("ne declenche rien a une autre minute", () => {
    expect(decideSchedule(base, new Date("2026-10-14T07:01:00Z"))).toEqual({ status: "not-due" });
  });

  it("declenche le mercredi a 09:00 (Paris) et vise la semaine suivante", () => {
    expect(decideSchedule(base, new Date("2026-10-14T07:00:00Z"))).toEqual({
      status: "due",
      weekYear: 2026,
      weekNumber: 43,
    });
  });

  it("gere le passage a l'annee suivante", () => {
    expect(decideSchedule(base, new Date("2025-12-31T08:00:00Z"))).toEqual({
      status: "due",
      weekYear: 2026,
      weekNumber: 2,
    });
  });
});
