import { describe, expect, it } from "vitest";
import {
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  ROLE_ORDER,
  isManagerRole,
  roleSortIndex,
  type AccountRole,
} from "./roles";

describe("roles", () => {
  it("declare les trois roles dans l'ordre attendu", () => {
    expect(ROLE_ORDER).toEqual(["ADMIN", "MANAGER", "USER"]);
  });

  it("fournit un libelle et une description pour chaque role", () => {
    for (const role of ROLE_ORDER) {
      expect(ROLE_LABELS[role]).toBeTruthy();
      expect(ROLE_DESCRIPTIONS[role]).toBeTruthy();
    }
    expect(ROLE_LABELS.MANAGER).toBe("Gestionnaire");
    expect(ROLE_LABELS.USER).toBe("Utilisateur");
  });

  it("autorise la gestion pour les administrateurs et les gestionnaires uniquement", () => {
    expect(isManagerRole("ADMIN")).toBe(true);
    expect(isManagerRole("MANAGER")).toBe(true);
    expect(isManagerRole("USER")).toBe(false);
  });

  it("ordonne les roles administrateur, gestionnaire, utilisateur", () => {
    expect(roleSortIndex("ADMIN")).toBeLessThan(roleSortIndex("MANAGER"));
    expect(roleSortIndex("MANAGER")).toBeLessThan(roleSortIndex("USER"));
  });

  it("place un role inconnu en fin de liste", () => {
    expect(roleSortIndex("INCONNU" as AccountRole)).toBe(ROLE_ORDER.length);
  });
});
