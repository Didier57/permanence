import { describe, expect, it } from "vitest";
import {
  decideSchedule,
  findDueSlots,
  findMissedSlots,
  getZonedParts,
  parseSendTime,
  slotOccurrence,
} from "./schedule";

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

  it("vise la semaine en cours au jour d'envoi quand weekOffset vaut 0", () => {
    expect(decideSchedule({ ...base, weekOffset: 0 }, new Date("2026-10-14T07:00:00Z"))).toEqual({
      status: "due",
      weekYear: 2026,
      weekNumber: 42,
    });
  });

  it("vise la semaine suivante quand weekOffset vaut 1", () => {
    expect(decideSchedule({ ...base, weekOffset: 1 }, new Date("2026-10-14T07:00:00Z"))).toEqual({
      status: "due",
      weekYear: 2026,
      weekNumber: 43,
    });
  });
});

describe("findDueSlots", () => {
  const config = { enabled: true, timezone: "Europe/Paris" };
  const slots = [
    { id: "lundi-matin", dayOfWeek: 1, sendTime: "09:00", weekOffset: 0, enabled: true },
    { id: "mercredi", dayOfWeek: 3, sendTime: "09:00", weekOffset: 1, enabled: true },
    { id: "jeudi-desactive", dayOfWeek: 4, sendTime: "09:00", weekOffset: 1, enabled: false },
  ];

  it("ne renvoie rien quand l'envoi automatique est desactive", () => {
    expect(findDueSlots(slots, { ...config, enabled: false }, new Date("2026-10-14T07:00:00Z"))).toEqual(
      [],
    );
  });

  it("ne declenche que le creneau dont le jour et l'heure correspondent", () => {
    expect(findDueSlots(slots, config, new Date("2026-10-14T07:00:00Z"))).toEqual([
      { id: "mercredi", weekYear: 2026, weekNumber: 43 },
    ]);
  });

  it("gere plusieurs creneaux le meme jour avec des semaines visees differentes", () => {
    const bothSameDay = [
      { id: "matin", dayOfWeek: 1, sendTime: "09:00", weekOffset: 0, enabled: true },
      { id: "matin-suivante", dayOfWeek: 1, sendTime: "09:00", weekOffset: 1, enabled: true },
    ];
    expect(findDueSlots(bothSameDay, config, new Date("2026-10-19T07:00:00Z"))).toEqual([
      { id: "matin", weekYear: 2026, weekNumber: 43 },
      { id: "matin-suivante", weekYear: 2026, weekNumber: 44 },
    ]);
  });

  it("ignore un creneau desactive", () => {
    expect(findDueSlots(slots, config, new Date("2026-10-15T07:00:00Z"))).toEqual([]);
  });
});

describe("slotOccurrence", () => {
  const slot = { dayOfWeek: 3, sendTime: "09:00" };

  it("renvoie l'instant prevu quand l'heure correspond", () => {
    const occurrence = slotOccurrence(slot, "Europe/Paris", new Date("2026-10-14T07:00:00Z"));
    expect(occurrence).toEqual({
      dateKey: "2026-10-14",
      hour: 9,
      minute: 0,
      offsetMinutes: 0,
    });
  });

  it("indique un retard de quelques minutes", () => {
    const occurrence = slotOccurrence(slot, "Europe/Paris", new Date("2026-10-14T07:01:30Z"));
    expect(occurrence?.offsetMinutes).toBe(-1);
    expect(occurrence?.dateKey).toBe("2026-10-14");
  });

  it("indique un declenchement a venir", () => {
    const occurrence = slotOccurrence(slot, "Europe/Paris", new Date("2026-10-14T06:00:00Z"));
    expect(occurrence?.offsetMinutes).toBe(60);
    expect(occurrence?.dateKey).toBe("2026-10-14");
  });

  it("remonte au jour precedent pour un declenchement manque de la veille", () => {
    const occurrence = slotOccurrence(slot, "Europe/Paris", new Date("2026-10-15T07:00:00Z"));
    expect(occurrence?.offsetMinutes).toBe(-1440);
    expect(occurrence?.dateKey).toBe("2026-10-14");
  });

  it("gere un creneau en fin de journee vu depuis le lendemain matin", () => {
    const occurrence = slotOccurrence(
      { dayOfWeek: 0, sendTime: "23:30" },
      "Europe/Paris",
      new Date("2026-10-18T22:10:00Z"),
    );
    expect(occurrence?.offsetMinutes).toBe(-40);
    expect(occurrence?.dateKey).toBe("2026-10-18");
  });

  it("refuse une heure invalide", () => {
    expect(slotOccurrence({ dayOfWeek: 1, sendTime: "99:99" }, "Europe/Paris", new Date())).toBeNull();
  });
});

describe("findMissedSlots", () => {
  const config = { enabled: true, timezone: "Europe/Paris" };
  const slots = [
    { id: "lundi-matin", dayOfWeek: 1, sendTime: "09:00", weekOffset: 0, enabled: true },
    { id: "mercredi", dayOfWeek: 3, sendTime: "09:00", weekOffset: 1, enabled: true },
    { id: "jeudi-desactive", dayOfWeek: 4, sendTime: "09:00", weekOffset: 1, enabled: false },
  ];

  it("rattrape un declenchement de la veille dans la fenetre", () => {
    expect(findMissedSlots(slots, config, new Date("2026-10-15T07:00:00Z"), 1440)).toEqual([
      { id: "mercredi", weekYear: 2026, weekNumber: 43 },
    ]);
  });

  it("ignore ce qui est plus vieux que la fenetre", () => {
    expect(findMissedSlots(slots, config, new Date("2026-10-15T07:00:00Z"), 720)).toEqual([]);
  });

  it("ne rattrape rien quand l'envoi automatique est desactive", () => {
    expect(
      findMissedSlots(slots, { ...config, enabled: false }, new Date("2026-10-15T07:00:00Z"), 1440),
    ).toEqual([]);
  });
});
