import { z } from "zod";

export const emailAddress = z.string().trim().pipe(z.email("Adresse email invalide"));

/**
 * Decoupe une saisie libre (virgules, points-virgules, espaces) en une liste
 * d'adresses email valides, sans doublon et en conservant l'ordre.
 */
export function parseRecipients(raw: string): string[] {
  const parts = raw
    .split(/[\s,;]+/)
    .map((value) => value.trim())
    .filter(Boolean);
  const valid: string[] = [];
  for (const part of parts) {
    if (emailAddress.safeParse(part).success) valid.push(part);
  }
  return [...new Set(valid)];
}

export function uniqueEmails(values: (string | null | undefined)[]): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

export type RecipientSelection = {
  recipients: string[];
  partial: boolean;
};

/**
 * Restreint les destinataires concernes par une semaine a la selection demandee.
 * `null`/`undefined` = envoi a tous. Retourne `null` si la selection ne contient
 * aucune adresse concerne par la semaine.
 */
export function selectRecipients(
  concerned: (string | null | undefined)[],
  requested?: (string | null | undefined)[] | null,
): RecipientSelection | null {
  const everyone = uniqueEmails(concerned);
  if (everyone.length === 0) return null;
  if (requested === undefined || requested === null) {
    return { recipients: everyone, partial: false };
  }
  const wanted = new Set(
    requested.map((value) => value?.trim().toLowerCase() ?? "").filter(Boolean),
  );
  const selected = everyone.filter((email) => wanted.has(email.trim().toLowerCase()));
  if (selected.length === 0) return null;
  return { recipients: selected, partial: selected.length < everyone.length };
}
