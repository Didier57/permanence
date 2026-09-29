import { describe, expect, it } from "vitest";
import { accountLinkPath, buildAccountEmail, buildAccountLinkUrl, buildWeekEmail } from "./email";
import type { PlanningEntry, WeekSnapshot } from "./planning";

function entry(overrides: Partial<PlanningEntry> & Pick<PlanningEntry, "date" | "groupId" | "userId">): PlanningEntry {
  return {
    groupName: "Groupe",
    groupDescription: null,
    groupColor: null,
    groupPosition: 0,
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

const orderedSnapshot: WeekSnapshot = {
  weekYear: 2026,
  weekNumber: 42,
  weekStart: "2026-10-12",
  weekEnd: "2026-10-18",
  entries: [
    entry({
      date: "2026-10-12",
      groupId: "g-zeta",
      groupName: "Zeta",
      groupPosition: 1,
      userId: "u-jean",
      userName: "Jean Dupont",
    }),
    entry({
      date: "2026-10-12",
      groupId: "g-alpha",
      groupName: "Alpha",
      groupPosition: 0,
      userId: "u-pierre",
      userName: "Pierre Martin",
    }),
  ],
};

describe("buildWeekEmail order", () => {
  it("respecte la position des groupes", () => {
    const email = buildWeekEmail(orderedSnapshot);
    expect(email.html.indexOf("Alpha")).toBeLessThan(email.html.indexOf("Zeta"));
  });
});

describe("buildWeekEmail", () => {
  const email = buildWeekEmail(snapshot);

  it("compose le sujet attendu", () => {
    expect(email.subject).toBe("Permanence semaine 42 du 12/10/2026 à 18/10/2026");
  });

  it("ajoute (UPDATE) au sujet lorsqu'il s'agit d'un renvoi apres modification", () => {
    const updated = buildWeekEmail(snapshot, { isUpdate: true });
    expect(updated.subject).toBe("Permanence semaine 42 du 12/10/2026 à 18/10/2026 (UPDATE)");
  });

  it("deduplique les destinataires (un utilisateur = un seul email)", () => {
    expect(email.recipients).toEqual(["jean@example.com", "pierre@example.com"]);
  });

  it("contient l'integralite du planning (tous les groupes)", () => {
    expect(email.text).toContain("Semaine 42 du 12/10/2026 au 18/10/2026");
    expect(email.text).toContain("Informatique");
    expect(email.text).toContain("Securite");
    expect(email.text).not.toContain("Groupe :");
    expect(email.text).toContain("Lundi : Jean Dupont");
    expect(email.text).toContain("Mardi : Pierre Martin");
  });

  it("affiche le nom du groupe suivi de sa description entre parentheses", () => {
    const withDescription = buildWeekEmail({
      weekYear: 2026,
      weekNumber: 42,
      weekStart: "2026-10-12",
      weekEnd: "2026-10-18",
      entries: [
        entry({
          date: "2026-10-12",
          groupId: "g-uc",
          groupName: "On-duty UC-LE",
          groupDescription: "Astreinte equipement",
          userId: "u-didier",
          userName: "Didier",
          userEmail: "didier@example.com",
        }),
      ],
    });
    expect(withDescription.text).toContain("On-duty UC-LE (Astreinte equipement)");
    expect(withDescription.text).not.toContain("Groupe :");
    expect(withDescription.html).toContain("On-duty UC-LE (Astreinte equipement)");
  });

  it("regroupe les jours consecutifs d'un meme utilisateur et ajoute des lignes pour les exceptions", () => {
    const days = ["12", "13", "14", "15", "16", "17", "18"];
    const weekly = buildWeekEmail({
      weekYear: 2026,
      weekNumber: 42,
      weekStart: "2026-10-12",
      weekEnd: "2026-10-18",
      entries: days.map((day, index) =>
        entry({
          date: `2026-10-${day}`,
          groupId: "g-info",
          groupName: "Informatique",
          ...(index < 5
            ? { userId: "u-didier", userName: "Didier" }
            : { userId: "u-volker", userName: "Volker" }),
        }),
      ),
    });
    expect(weekly.text).toContain("Lundi à Vendredi : Didier");
    expect(weekly.text).toContain("Samedi à Dimanche : Volker");
  });

  it("affiche une seule ligne Lundi à Dimanche quand le meme utilisateur couvre toute la semaine", () => {
    const days = ["12", "13", "14", "15", "16", "17", "18"];
    const weekly = buildWeekEmail({
      weekYear: 2026,
      weekNumber: 42,
      weekStart: "2026-10-12",
      weekEnd: "2026-10-18",
      entries: days.map((day) =>
        entry({
          date: `2026-10-${day}`,
          groupId: "g-info",
          groupName: "Informatique",
          userId: "u-jean",
          userName: "Jean Dupont",
        }),
      ),
    });
    expect(weekly.text.match(/Lundi à Dimanche : Jean Dupont/g)).toHaveLength(1);
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

  it("rend l'email et le telephone cliquables", () => {
    expect(email.html).toContain('href="mailto:jean@example.com"');
    expect(email.html).toContain('href="tel:0102030405"');
    expect(email.html).toContain('href="tel:0607080910"');
    expect(email.html).not.toContain("tel:—");
  });

  it("compacte la mise en page pour tenir sur une page A4 portrait", () => {
    expect(email.html).toContain("@page{size:A4 portrait");
    expect(email.html).toContain("table{font-size:10px !important;");
    expect(email.html).toContain("font-size:12px;");
    expect(email.html).not.toContain("font-size:18px");
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

  it("insere le texte d'introduction avant les groupes et le texte de fin apres", () => {
    const withTemplate = buildWeekEmail(snapshot, {
      introHtml: '<p style="color:#dc2626;">Merci de prevenir en cas <strong>d\'empechement</strong>.</p>',
      outroHtml: '<p>Contact : <a href="mailto:responsable@example.com">responsable@example.com</a></p>',
    });

    expect(withTemplate.html).toContain('color:#dc2626');
    expect(withTemplate.html.indexOf("d'empechement")).toBeLessThan(
      withTemplate.html.indexOf("Informatique"),
    );
    expect(withTemplate.html.indexOf("responsable@example.com")).toBeGreaterThan(
      withTemplate.html.indexOf("Informatique"),
    );
    expect(withTemplate.text).toContain("Merci de prevenir en cas d'empechement.");
    expect(withTemplate.text).toContain("Contact : responsable@example.com");
  });

  it("nettoie le HTML du modele avant de l'inserer", () => {
    const withTemplate = buildWeekEmail(snapshot, {
      introHtml: '<p onclick="steal()">Bonjour</p><script>alert(1)</script>',
    });
    expect(withTemplate.html).not.toContain("<script>");
    expect(withTemplate.html).not.toContain("onclick");
    expect(withTemplate.html).toContain("Bonjour");
  });
});

describe("buildAccountEmail", () => {
  const expiresAt = new Date(Date.UTC(2026, 9, 14, 9, 0, 0));

  it("prepare un email d'activation avec le lien et la date d'expiration", () => {
    const email = buildAccountEmail({
      kind: "ACTIVATION",
      name: "Jean Dupont",
      url: "https://exemple.fr/activer?token=abc",
      expiresAt,
    });
    expect(email.subject).toBe("Activation de votre compte Permanence");
    expect(email.text).toContain("Bonjour Jean Dupont,");
    expect(email.text).toContain("https://exemple.fr/activer?token=abc");
    expect(email.text).toContain("14/10/2026");
    expect(email.html).toContain("Activer mon compte");
  });

  it("prepare un email de reinitialisation", () => {
    const email = buildAccountEmail({
      kind: "RESET",
      url: "https://exemple.fr/reinitialiser?token=abc",
      expiresAt,
    });
    expect(email.subject).toBe("Reinitialisation de votre mot de passe Permanence");
    expect(email.text).toContain("Bonjour,");
    expect(email.html).toContain("Definir un nouveau mot de passe");
  });

  it("construit les liens vers les bonnes pages", () => {
    expect(accountLinkPath("ACTIVATION")).toBe("/activer");
    expect(accountLinkPath("RESET")).toBe("/reinitialiser");
    expect(buildAccountLinkUrl("tok en", "ACTIVATION")).toContain("/activer?token=tok%20en");
  });
});
