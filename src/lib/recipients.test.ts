import { describe, expect, it } from "vitest";
import { parseRecipients, uniqueEmails } from "./recipients";

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
