import { describe, expect, it } from "vitest";

import { databaseLabel } from "./database";

describe("databaseLabel", () => {
  it("decrit l'hote, le port et la base sans les identifiants", () => {
    expect(databaseLabel("postgresql://user:secret@db:5432/permanence?schema=public")).toBe(
      "db:5432/permanence",
    );
  });

  it("retombe sur le port 5432 quand il n'est pas precise", () => {
    expect(databaseLabel("postgresql://user:secret@localhost/permanence")).toBe(
      "localhost:5432/permanence",
    );
  });

  it("signale une URL absente ou illisible", () => {
    expect(databaseLabel("")).toBe("(DATABASE_URL absente)");
    expect(databaseLabel(undefined)).toBe("(DATABASE_URL absente)");
    expect(databaseLabel("pas une url")).toBe("(DATABASE_URL illisible)");
  });
});
