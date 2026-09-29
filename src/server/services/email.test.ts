import { describe, expect, it } from "vitest";
import { buildWeekEmail } from "./email";
import type { PlanningEntry, WeekSnapshot } from "./planning";

function entry(overrides: Partial<PlanningEntry> & Pick<PlanningEntry, "date" | "groupId" | "userId">): PlanningEntry {
  return {
    groupName: "Groupe",
    groupColor: null,
    userName: "Utilisateur",
    userEmail: "user@example.com",
    userProPhone: null,
    userPrivatePhone: null,
    ...overrides,
  };
}

const snapshot: WeekSnapshot = {
  weekYear: 2026,
  weekNumber: 42,
  weekStart: "2026-10-12",
  weekEnd: "2026-10-18",
  entries: [
    entry({
      date: "2026-10-12",
      groupId: "g-info",
      groupName: "Informatique",
      userId: "u-jean",
      userName: "Jean Dupont",
      userEmail: "jean@example.com",
      userProPhone: "0102030405",
    }),
    entry({
      date: "2026-10-12",
      groupId: "g-secu",
      groupName: "Securite",
      userId: "u-jean",
      userName: "Jean Dupont",
      userEmail: "jean@example.com",
    }),
    entry({
      date: "2026-10-13",
      groupId: "g-info",
      groupName: "Informatique",
      userId: "u-pierre",
      userName: "Pierre Martin",
      userEmail: "pierre@example.com",
      userPrivatePhone: "0607080910",
    }),
  ],
};

describe("buildWeekEmail", () => {
  const email = buildWeekEmail(snapshot);

  it("compose le sujet attendu", () => {
    expect(email.subject).toBe("Permanence semaine 42 du 12/10/2026 à 18/10/2026");
  });

  it("deduplique les destinataires (un utilisateur = un seul email)", () => {
    expect(email.recipients).toEqual(["jean@example.com", "pierre@example.com"]);
  });

  it("contient l'integralite du planning (tous les jours et tous les groupes)", () => {
    expect(email.text).toContain("Semaine 42 du 12/10/2026 au 18/10/2026");
    expect(email.text).toContain("Groupe : Informatique");
    expect(email.text).toContain("Groupe : Securite");
    expect(email.text).toContain("Lundi 12/10");
    expect(email.text).toContain("Mardi 13/10");
    expect(email.text).toContain("Utilisateur : Jean Dupont");
    expect(email.text).toContain("Utilisateur : Pierre Martin");
  });

  it("affiche le telephone professionnel puis prive en secours", () => {
    expect(email.text).toContain("Téléphone : 0102030405");
    expect(email.text).toContain("Téléphone : 0607080910");
  });

  it("fournit une version HTML avec echappement", () => {
    expect(email.html).toContain("<!DOCTYPE html>");
    expect(email.html).toContain("Informatique");
    expect(email.html).toContain("jean@example.com");
  });

  it("echappe les caracteres dangereux dans le HTML", () => {
    const dangerous = buildWeekEmail({
      ...snapshot,
      entries: [
        entry({
          date: "2026-10-12",
          groupId: "g1",
          groupName: "<script>alert(1)</script>",
          userId: "u1",
        }),
      ],
    });
    expect(dangerous.html).not.toContain("<script>alert(1)</script>");
    expect(dangerous.html).toContain("&lt;script&gt;");
  });
});
