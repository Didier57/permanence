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
