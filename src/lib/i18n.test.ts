import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  EN_MESSAGES,
  createTranslator,
  formatMessage,
  isLocale,
  resolveLocale,
} from "./i18n";

describe("formatMessage", () => {
  it("remplace les variables presentes", () => {
    expect(formatMessage("Semaine {week} pour {name}", { week: 42, name: "Jean" })).toBe(
      "Semaine 42 pour Jean",
    );
  });

  it("laisse le gabarit inchange sans variables", () => {
    expect(formatMessage("Aucune variable")).toBe("Aucune variable");
  });

  it("conserve le placeholder si la variable est absente", () => {
    expect(formatMessage("Semaine {week}", {})).toBe("Semaine {week}");
  });
});

describe("createTranslator", () => {
  it("traduit les messages anglais", () => {
    const t = createTranslator("en");
    expect(t("Planning")).toBe("Schedule");
    expect(t("Sauvegarde")).toBe("Backup");
  });

  it("retombe sur le message francais si la traduction est absente", () => {
    const t = createTranslator("en");
    const unknown = "Chaine sans traduction";
    expect(t(unknown)).toBe(unknown);
  });

  it("ne modifie rien en francais", () => {
    const t = createTranslator("fr");
    expect(t("Planning")).toBe("Planning");
  });

  it("applique les variables apres traduction", () => {
    const t = createTranslator("fr");
    expect(t("Semaine {week} / {year}", { week: 42, year: 2026 })).toBe("Semaine 42 / 2026");
  });
});

describe("isLocale", () => {
  it("accepte les locales connues", () => {
    expect(isLocale("fr")).toBe(true);
    expect(isLocale("en")).toBe(true);
  });

  it("refuse les autres valeurs", () => {
    expect(isLocale("de")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
    expect(isLocale(42)).toBe(false);
  });
});

describe("resolveLocale", () => {
  it("renvoie la locale valide", () => {
    expect(resolveLocale("en")).toBe("en");
  });

  it("retombe sur la locale par defaut", () => {
    expect(resolveLocale(null)).toBe(DEFAULT_LOCALE);
    expect(resolveLocale("xx")).toBe(DEFAULT_LOCALE);
  });
});

describe("EN_MESSAGES", () => {
  it("ne contient que des traductions non vides", () => {
    for (const [key, value] of Object.entries(EN_MESSAGES)) {
      expect(key.length).toBeGreaterThan(0);
      expect(value.length).toBeGreaterThan(0);
    }
  });
});
