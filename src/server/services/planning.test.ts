import { describe, expect, it } from "vitest";
import { canonicalize, snapshotHash, type PlanningEntry, type WeekSnapshot } from "./planning";

function entry(overrides: Partial<PlanningEntry> & Pick<PlanningEntry, "date" | "groupId" | "userId">): PlanningEntry {
  return {
    groupName: "Groupe",
    groupDescription: null,
    groupColor: null,
    userName: "Utilisateur",
    userEmail: "user@example.com",
    userProPhone: null,
    userPrivatePhone: null,
    ...overrides,
  };
}

function snapshot(entries: PlanningEntry[]): WeekSnapshot {
  return {
    weekYear: 2026,
    weekNumber: 42,
    weekStart: "2026-10-12",
    weekEnd: "2026-10-18",
    entries,
  };
}

describe("canonicalize / snapshotHash", () => {
  it("produit le meme hash quel que soit l'ordre des affectations", () => {
    const a = snapshot([
      entry({ date: "2026-10-12", groupId: "g1", userId: "u1" }),
      entry({ date: "2026-10-13", groupId: "g2", userId: "u2" }),
    ]);
    const b = snapshot([
      entry({ date: "2026-10-13", groupId: "g2", userId: "u2" }),
      entry({ date: "2026-10-12", groupId: "g1", userId: "u1" }),
    ]);
    expect(snapshotHash(a)).toBe(snapshotHash(b));
  });

  it("change de hash lorsqu'une affectation est modifiee (remplacement)", () => {
    const before = snapshot([entry({ date: "2026-10-12", groupId: "g1", userId: "u1" })]);
    const after = snapshot([entry({ date: "2026-10-12", groupId: "g1", userId: "u2" })]);
    expect(snapshotHash(before)).not.toBe(snapshotHash(after));
  });

  it("change de hash lorsqu'un jour est ajoute", () => {
    const before = snapshot([entry({ date: "2026-10-12", groupId: "g1", userId: "u1" })]);
    const after = snapshot([
      entry({ date: "2026-10-12", groupId: "g1", userId: "u1" }),
      entry({ date: "2026-10-14", groupId: "g1", userId: "u1" }),
    ]);
    expect(snapshotHash(before)).not.toBe(snapshotHash(after));
  });

  it("ignore les changements de coordonnees (telephone/email) : ce n'est pas une modif de planning", () => {
    const before = snapshot([entry({ date: "2026-10-12", groupId: "g1", userId: "u1" })]);
    const after = snapshot([
      entry({
        date: "2026-10-12",
        groupId: "g1",
        userId: "u1",
        userProPhone: "0102030405",
        userEmail: "nouveau@example.com",
      }),
    ]);
    expect(snapshotHash(before)).toBe(snapshotHash(after));
  });

  it("distingue deux semaines differentes", () => {
    const w42 = snapshot([entry({ date: "2026-10-12", groupId: "g1", userId: "u1" })]);
    const w43: WeekSnapshot = { ...w42, weekNumber: 43 };
    expect(snapshotHash(w42)).not.toBe(snapshotHash(w43));
  });

  it("canonicalize ne retient que [date, groupId, userId]", () => {
    const canonical = canonicalize(snapshot([entry({ date: "2026-10-12", groupId: "g1", userId: "u1" })]));
    expect(canonical).toBe(JSON.stringify({ w: "2026-42", e: [["2026-10-12", "g1", "u1"]] }));
  });
});
