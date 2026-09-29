import { describe, expect, it } from "vitest";
import { parseRecipients, selectRecipients, uniqueEmails } from "./recipients";

describe("parseRecipients", () => {
  it("decoupe virgules, points-virgules et espaces", () => {
    expect(parseRecipients("a@example.com, b@example.com; c@example.com d@example.com")).toEqual([
      "a@example.com",
      "b@example.com",
      "c@example.com",
      "d@example.com",
    ]);
  });

  it("deduplique en conservant l'ordre", () => {
    expect(parseRecipients("a@example.com, b@example.com, a@example.com")).toEqual([
      "a@example.com",
      "b@example.com",
    ]);
  });

  it("ignore les entrees invalides et vides", () => {
    expect(parseRecipients("pasunemail, , a@example.com")).toEqual(["a@example.com"]);
  });

  it("retourne un tableau vide si rien de valide", () => {
    expect(parseRecipients("nope")).toEqual([]);
  });
});

describe("uniqueEmails", () => {
  it("deduplique et retire les valeurs nulles", () => {
    expect(uniqueEmails(["a@example.com", null, "a@example.com", undefined, "b@example.com"])).toEqual([
      "a@example.com",
      "b@example.com",
    ]);
  });
});

describe("selectRecipients", () => {
  const concerned = ["a@example.com", "b@example.com", "c@example.com"];

  it("envoie a tous quand aucune selection n'est fournie", () => {
    expect(selectRecipients(concerned)).toEqual({ recipients: concerned, partial: false });
    expect(selectRecipients(concerned, null)).toEqual({ recipients: concerned, partial: false });
  });

  it("restreint a la selection en ignorant la casse et les inconnus", () => {
    expect(selectRecipients(concerned, ["B@EXAMPLE.com", "z@example.com"])).toEqual({
      recipients: ["b@example.com"],
      partial: true,
    });
  });

  it("n'est pas partiel si toute la selection est couverte", () => {
    expect(selectRecipients(concerned, ["c@example.com", "a@example.com", "b@example.com"])).toEqual({
      recipients: concerned,
      partial: false,
    });
  });

  it("retourne null si la selection est vide ou inconnue", () => {
    expect(selectRecipients(concerned, [])).toBeNull();
    expect(selectRecipients(concerned, ["z@example.com"])).toBeNull();
    expect(selectRecipients([], null)).toBeNull();
  });
});
