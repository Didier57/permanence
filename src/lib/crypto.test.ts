import { describe, expect, it } from "vitest";
import {
  decryptSecret,
  encryptSecret,
  generateToken,
  hashPassword,
  hashToken,
  maskSecret,
  safeEqual,
  sha256,
  verifyPassword,
} from "./crypto";

describe("mot de passe", () => {
  it("hache et verifie un mot de passe", async () => {
    const hash = await hashPassword("MotDePasse!123");
    expect(hash).not.toContain("MotDePasse");
    await expect(verifyPassword(hash, "MotDePasse!123")).resolves.toBe(true);
    await expect(verifyPassword(hash, "mauvais")).resolves.toBe(false);
  });

  it("ne plante pas sur un hash invalide", async () => {
    await expect(verifyPassword("pas-un-hash", "x")).resolves.toBe(false);
  });
});

describe("chiffrement des secrets (SMTP)", () => {
  it("chiffre puis dechiffre un secret", () => {
    const encrypted = encryptSecret("s3cr3t-smtp");
    expect(encrypted).not.toContain("s3cr3t-smtp");
    expect(encrypted.startsWith("v1:")).toBe(true);
    expect(decryptSecret(encrypted)).toBe("s3cr3t-smtp");
  });

  it("produit un chiffre different a chaque appel", () => {
    expect(encryptSecret("meme")).not.toBe(encryptSecret("meme"));
  });

  it("retourne null pour une valeur absente ou corrompue", () => {
    expect(decryptSecret(null)).toBeNull();
    expect(decryptSecret("")).toBeNull();
    expect(decryptSecret("v1:invalide")).toBeNull();
    expect(decryptSecret("v1:aaa:bbb:ccc")).toBeNull();
  });
});

describe("jetons et hachage", () => {
  it("genere des jetons uniques", () => {
    expect(generateToken()).not.toBe(generateToken());
    expect(generateToken(8).length).toBeGreaterThan(0);
  });

  it("sha256 est deterministe et hashToken en derive", () => {
    expect(sha256("abc")).toBe(hashToken("abc"));
    expect(sha256("abc")).not.toBe(sha256("abd"));
  });

  it("safeEqual compare des chaines", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});

describe("maskSecret", () => {
  it("masque uniquement si un secret existe", () => {
    expect(maskSecret(true)).toBe("********");
    expect(maskSecret(false)).toBe("");
  });
});
