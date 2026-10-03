import { fromDateInput, startOfISOWeek } from "@/lib/date";
import { prisma } from "@/lib/db";
import { getTimezone } from "./app-config";
import { nextSlotDateKey } from "@/worker/schedule";

export const CALL_CENTER_LINK_ID = "callcenter";

export type PublicLinkState = {
  token: string;
  previousToken: string | null;
  previousExpiresAt: Date | null;
};

/**
 * Renvoie l'etat du lien public global. Le jeton actif est cree a la volee
 * s'il n'existe pas encore, afin que la page Emails dispose toujours d'un lien.
 */
export async function getOrCreatePublicLink(tokenFactory: () => string): Promise<PublicLinkState> {
  const existing = await prisma.publicLink.findUnique({ where: { id: CALL_CENTER_LINK_ID } });
  if (existing) {
    return {
      token: existing.token,
      previousToken: existing.previousToken,
      previousExpiresAt: existing.previousExpiresAt,
    };
  }
  const created = await prisma.publicLink.create({
    data: { id: CALL_CENTER_LINK_ID, token: tokenFactory() },
  });
  return {
    token: created.token,
    previousToken: created.previousToken,
    previousExpiresAt: created.previousExpiresAt,
  };
}

/**
 * Determine la date/heure a laquelle l'ancien jeton doit cesser d'etre valable :
 * le prochain declenchement planifie d'un creneau CALLCENTER actif. Si aucun
 * creneau n'est programme, on retombe sur le lundi suivant 9h (comportement
 * historique d'expiration du lien).
 */
export async function nextCallCenterSendAt(reference: Date = new Date()): Promise<Date> {
  const timezone = await getTimezone();
  const slots = await prisma.emailSchedule.findMany({
    where: { kind: "CALLCENTER", enabled: true },
    select: { dayOfWeek: true, sendTime: true },
  });

  let earliest: Date | null = null;
  for (const slot of slots) {
    const dateKeyValue = nextSlotDateKey(slot, timezone, reference);
    if (!dateKeyValue) continue;
    const at = fromDateInput(dateKeyValue);
    if (!earliest || at.getTime() < earliest.getTime()) earliest = at;
  }
  if (earliest) return earliest;

  const monday = startOfISOWeek(reference);
  return new Date(
    Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + 8, 9, 0, 0),
  );
}

/**
 * Fait tourner le jeton public global : le jeton courant devient le jeton
 * precedent, valable jusqu'au prochain envoi planifie CALLCENTER, et un nouveau
 * jeton actif est genere immediatement.
 */
export async function rotatePublicLink(tokenFactory: () => string): Promise<PublicLinkState> {
  const expiresAt = await nextCallCenterSendAt();
  const current = await getOrCreatePublicLink(tokenFactory);
  const updated = await prisma.publicLink.update({
    where: { id: CALL_CENTER_LINK_ID },
    data: {
      token: tokenFactory(),
      previousToken: current.token,
      previousExpiresAt: expiresAt,
    },
  });
  return {
    token: updated.token,
    previousToken: updated.previousToken,
    previousExpiresAt: updated.previousExpiresAt,
  };
}

/**
 * Indique si un jeton donne correspond au jeton actif ou a l'ancien jeton encore
 * valable. Renvoie false si le jeton est l'ancien et que sa date est depassee.
 */
export async function isPublicTokenActive(token: string, reference: Date = new Date()): Promise<boolean> {
  const trimmed = token.trim();
  if (!trimmed) return false;
  const link = await prisma.publicLink.findUnique({ where: { id: CALL_CENTER_LINK_ID } });
  if (!link) return false;
  if (link.token === trimmed) return true;
  if (link.previousToken === trimmed) {
    if (!link.previousExpiresAt) return true;
    return reference.getTime() <= link.previousExpiresAt.getTime();
  }
  return false;
}
