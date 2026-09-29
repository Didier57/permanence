const BLOCK_WITH_CONTENT =
  /<(script|style|iframe|object|embed|form|template|svg)[\s\S]*?<\/\1>/gi;
const VOID_DANGEROUS = /<(script|iframe|object|embed|link|meta|base)[^>]*\/?>/gi;
const EVENT_ATTRIBUTE = /\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const UNSAFE_URL = /(href|src|xlink:href)\s*=\s*(?:"|')?\s*(?:javascript|vbscript|data:text\/html)\s*:/gi;
const CSS_EXPRESSION = /expression\s*\(/gi;

/**
 * Nettoie le HTML saisi dans l'editeur de modele d'email.
 * Renvoie null si le contenu est vide une fois nettoye.
 */
export function sanitizeRichText(input: string): string | null {
  const cleaned = input
    .replace(BLOCK_WITH_CONTENT, "")
    .replace(VOID_DANGEROUS, "")
    .replace(EVENT_ATTRIBUTE, "")
    .replace(UNSAFE_URL, "$1=")
    .replace(CSS_EXPRESSION, "")
    .trim();
  return cleaned.length > 0 ? cleaned : null;
}

const BLOCK_BREAK = /<\s*\/?\s*(br|p|div|h[1-6]|li|ul|ol|tr|table|section)\b[^>]*>/gi;
const TAG = /<[^>]*>/g;

const ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
};

function decodeEntities(value: string): string {
  return value.replace(/&(?:nbsp|amp|lt|gt|quot|#39|apos);/gi, (match) => {
    const key = Object.keys(ENTITIES).find(
      (entity) => entity.toLowerCase() === match.toLowerCase(),
    );
    return key ? ENTITIES[key] : match;
  });
}

/** Convertit un contenu HTML en version texte brut pour les emails sans HTML. */
export function htmlToPlainText(input: string): string {
  return decodeEntities(
    input.replace(BLOCK_BREAK, "\n").replace(TAG, ""),
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
