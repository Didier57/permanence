import { addDays, dateKey, fromDateInput, getISOWeekInfo, publicLinkExpiry, startOfISOWeek } from "@/lib/date";
import { prisma } from "@/lib/db";
import { getWeekSnapshot, type PlanningEntry } from "./planning";
import { getTimezone } from "./app-config";
import { isPublicTokenActive } from "./public-link";

export type PublicWeekGroup = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  position: number;
  entries: PlanningEntry[];
};

export type PublicWeekUser = {
  id: string;
  name: string;
  email: string;
  proPhone: string | null;
  privatePhone: string | null;
  groups: string[];
};

export type PublicWeekView = {
  weekYear: number;
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
  groups: PublicWeekGroup[];
  directory: Record<string, PublicWeekUser>;
};

/**
 * Resout un jeton public (global, partage par tous les creneaux CALLCENTER) vers
 * la semaine a afficher.
 *
 * Le jeton est stable pour tout le CallCenter. L'ancien jeton reste accepte
 * jusqu'a sa date d'expiration (prochain envoi planifie). La semaine visee est
 * deduite du premier creneau CALLCENTER actif (semaine en cours ou suivante).
 */
export async function getPublicWeekByToken(
  token: string,
): Promise<{ ok: true; view: PublicWeekView } | { ok: false; reason: "invalid" | "expired" }> {
  const trimmed = token.trim();
  if (!trimmed) return { ok: false, reason: "invalid" };

  const now = new Date();
  const active = await isPublicTokenActive(trimmed, now);
  if (!active) {
    // Distingue un ancien jeton expire d'un jeton totalement inconnu.
    const link = await prisma.publicLink.findUnique({
      where: { id: "callcenter" },
      select: { previousToken: true, previousExpiresAt: true },
    });
    if (link?.previousToken === trimmed && link.previousExpiresAt) {
      return { ok: false, reason: "expired" };
    }
    return { ok: false, reason: "invalid" };
  }

  const slot = await prisma.emailSchedule.findFirst({
    where: { kind: "CALLCENTER", enabled: true },
    orderBy: { createdAt: "asc" },
    select: { weekOffset: true, kind: true },
  });
  const slotOffsets = slot
    ? [slot]
    : await prisma.emailSchedule.findMany({
        where: { kind: "CALLCENTER" },
        orderBy: { createdAt: "asc" },
        select: { weekOffset: true, kind: true },
      });
  if (slotOffsets.length === 0) return { ok: false, reason: "invalid" };
  const weekOffset = slotOffsets[0].weekOffset;

  const timezone = await getTimezone();

  // Semaine visee aujourd'hui par ce creneau, dans son fuseau.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const lookup: Record<string, string> = {};
  for (const part of parts) lookup[part.type] = part.value;
  const localToday = new Date(
    Date.UTC(Number(lookup.year), Number(lookup.month) - 1, Number(lookup.day)),
  );

  const target = getISOWeekInfo(addDays(localToday, 7 * weekOffset));
  const weekStart = startOfISOWeek(localToday);
  const start =
    weekOffset === 0
      ? weekStart
      : startOfISOWeek(addDays(localToday, 7));
  const expiry = publicLinkExpiry(start);

  // Le lien reste valable jusqu'au mardi suivant 9h, en heure locale.
  const zonedNow = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const z: Record<string, string> = {};
  for (const part of zonedNow) z[part.type] = part.value;
  const localNow = new Date(
    Date.UTC(
      Number(z.year),
      Number(z.month) - 1,
      Number(z.day),
      Number(z.hour),
      Number(z.minute),
    ),
  );
  const expiryLocal = new Date(
    Date.UTC(
      expiry.getUTCFullYear(),
      expiry.getUTCMonth(),
      expiry.getUTCDate(),
      expiry.getUTCHours(),
      expiry.getUTCMinutes(),
    ),
  );
  if (localNow.getTime() > expiryLocal.getTime()) {
    return { ok: false, reason: "expired" };
  }

  const snapshot = await getWeekSnapshot(target.weekYear, target.weekNumber);
  const groupsMap = new Map<string, PublicWeekGroup>();
  for (const entry of snapshot.entries) {
    if (!groupsMap.has(entry.groupId)) {
      groupsMap.set(entry.groupId, {
        id: entry.groupId,
        name: entry.groupName,
        description: entry.groupDescription,
        color: entry.groupColor,
        position: entry.groupPosition,
        entries: [],
      });
    }
    groupsMap.get(entry.groupId)?.entries.push(entry);
  }
  const groups = [...groupsMap.values()].sort(
    (a, b) => a.position - b.position || a.name.localeCompare(b.name, "fr"),
  );

  const userIds = [...new Set(snapshot.entries.map((entry) => entry.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      proPhone: true,
      privatePhone: true,
      memberships: { select: { group: { select: { name: true } } } },
    },
  });
  const directory: Record<string, PublicWeekUser> = {};
  for (const user of users) {
    directory[user.id] = {
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      proPhone: user.proPhone,
      privatePhone: user.privatePhone,
      groups: user.memberships.map((membership) => membership.group.name).sort(),
    };
  }

  return {
    ok: true,
    view: {
      weekYear: target.weekYear,
      weekNumber: target.weekNumber,
      weekStart: dateKey(start),
      weekEnd: dateKey(addDays(start, 6)),
      groups,
      directory,
    },
  };
}

export function publicWeekRange(view: PublicWeekView): { start: Date; end: Date } {
  return { start: fromDateInput(view.weekStart), end: fromDateInput(view.weekEnd) };
}
