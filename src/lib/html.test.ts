import { describe, expect, it } from "vitest";
import { htmlToPlainText, sanitizeRichText } from "./html";

describe("sanitizeRichText", () => {
  it("conserve la mise en forme autorisee", () => {
    const html = '<p style="color:#dc2626;">Bonjour <strong>Jean</strong></p>';
    expect(sanitizeRichText(html)).toBe(html);
  });

  it("supprime les balises scripts et leur contenu", () => {
    expect(sanitizeRichText("<p>Bonjour</p><script>alert(1)</script>")).toBe("<p>Bonjour</p>");
  });

  it("supprime les gestionnaires d'evenements", () => {
    expect(sanitizeRichText('<p onclick="steal()" onmouseover=\'x\'>Bonjour</p>')).toBe("<p>Bonjour</p>");
  });

  it("neutralise les liens javascript:", () => {
    const cleaned = sanitizeRichText('<a href="javascript:alert(1)">lien</a>');
    expect(cleaned).not.toContain("javascript:");
    expect(cleaned).toContain("lien");
  });

  it("renvoie null pour un contenu vide", () => {
    expect(sanitizeRichText("   ")).toBeNull();
    expect(sanitizeRichText("\n\t")).toBeNull();
  });
});

describe("htmlToPlainText", () => {
  it("convertit les blocs en sauts de ligne", () => {
    expect(htmlToPlainText("<p>Ligne 1</p><p>Ligne 2</p>")).toBe("Ligne 1\n\nLigne 2");
  });

  it("supprime les balises et decode les entites", () => {
    expect(htmlToPlainText("<strong>Bonjour</strong>&nbsp;&amp;&nbsp;bonsoir")).toBe(
      "Bonjour & bonsoir",
    );
  });

  it("gere les liens et les listes", () => {
    const text = htmlToPlainText('<p>Voir <a href="https://exemple.fr">le site</a></p><ul><li>Un</li><li>Deux</li></ul>');
    expect(text).toContain("Voir le site");
    expect(text).toContain("Un");
    expect(text).toContain("Deux");
  });
});
