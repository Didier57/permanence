import { describe, expect, it } from "vitest";
import { backupFileName, parseBackup } from "./backup";

describe("backupFileName", () => {
  it("genere un nom de fichier date", () => {
    expect(backupFileName(new Date("2026-10-14T12:30:00Z"))).toBe(
      "permanence-backup-2026-10-14.json",
    );
  });
});

describe("parseBackup", () => {
  it("accepte une sauvegarde minimale et complete les tableaux manquants", () => {
    const parsed = parseBackup({ users: [], groups: [] });
    expect(parsed.memberships).toEqual([]);
    expect(parsed.permanences).toEqual([]);
    expect(parsed.emailConfiguration).toBeFalsy();
  });

  it("accepte une permanence datee sans numero de semaine", () => {
    const parsed = parseBackup({
      users: [{ id: "u1", firstName: "Jean", lastName: "Dupont", email: "jean@example.com" }],
      groups: [{ id: "g1", name: "Informatique" }],
      permanences: [{ date: "2026-10-14", userId: "u1", groupId: "g1" }],
    });
    expect(parsed.permanences).toHaveLength(1);
    expect(parsed.permanences[0]?.date).toBe("2026-10-14");
  });

  it("refuse une date de permanence invalide", () => {
    expect(() =>
      parseBackup({ permanences: [{ date: "14/10/2026", userId: "u1", groupId: "g1" }] }),
    ).toThrow();
  });

  it("refuse une permanence sans personne", () => {
    expect(() => parseBackup({ permanences: [{ date: "2026-10-14", groupId: "g1" }] })).toThrow();
  });

  it("accepte une configuration email complete", () => {
    const parsed = parseBackup({
      emailConfiguration: {
        smtpHost: "smtp.example.com",
        smtpPort: "587",
        fromAddress: "permanence@example.com",
        enabled: true,
      },
    });
    expect(parsed.emailConfiguration?.smtpPort).toBe(587);
    expect(parsed.emailConfiguration?.smtpEncryption).toBe("STARTTLS");
    expect(parsed.emailConfiguration?.ccRecipients).toEqual([]);
  });
});
