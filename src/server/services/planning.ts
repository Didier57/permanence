import { sha256 } from "@/lib/crypto";
import { dateKey, isoWeekRange } from "@/lib/date";
import { prisma } from "@/lib/db";

export type PlanningEntry = {
  date: string;
  groupId: string;
  groupName: string;
  groupDescription: string | null;
  groupColor: string | null;
  groupPosition: number;
  userId: string;
  userName: string;
  userEmail: string;
  userProPhone: string | null;
  userPrivatePhone: string | null;
};

export type WeekSnapshot = {
  weekYear: number;
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
  entries: PlanningEntry[];
};

export function canonicalize(snapshot: WeekSnapshot): string {
  const sorted = [...snapshot.entries].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.groupId !== b.groupId) return a.groupId < b.groupId ? -1 : 1;
    return a.userId < b.userId ? -1 : 1;
  });
  return JSON.stringify({
    w: `${snapshot.weekYear}-${snapshot.weekNumber}`,
    e: sorted.map((entry) => [entry.date, entry.groupId, entry.userId]),
  });
}

export function snapshotHash(snapshot: WeekSnapshot): string {
  return sha256(canonicalize(snapshot));
}

export async function getWeekSnapshot(weekYear: number, weekNumber: number): Promise<WeekSnapshot> {
  const { start, end } = isoWeekRange(weekYear, weekNumber);
  const permanences = await prisma.permanence.findMany({
    where: { date: { gte: start, lte: end } },
    include: { user: true, group: true },
    orderBy: [{ group: { position: "asc" } }, { date: "asc" }],
  });

  const entries: PlanningEntry[] = permanences.map((permanence) => ({
    date: dateKey(permanence.date),
    groupId: permanence.groupId,
    groupName: permanence.group.name,
    groupDescription: permanence.group.description,
    groupColor: permanence.group.color,
    groupPosition: permanence.group.position,
    userId: permanence.userId,
    userName: `${permanence.user.firstName} ${permanence.user.lastName}`,
    userEmail: permanence.user.email,
    userProPhone: permanence.user.proPhone,
    userPrivatePhone: permanence.user.privatePhone,
  }));

  return {
    weekYear,
    weekNumber,
    weekStart: dateKey(start),
    weekEnd: dateKey(end),
    entries,
  };
}

export async function getWeekHash(weekYear: number, weekNumber: number): Promise<string> {
  return snapshotHash(await getWeekSnapshot(weekYear, weekNumber));
}

export async function getLastSuccessfulSend(weekYear: number, weekNumber: number) {
  // Les envois partiels (selection de destinataires) ne comptent pas comme
  // l'envoi de la semaine : le planning reste "a renvoyer" et l'envoi
  // automatique programme part dans tous les cas.
  return prisma.emailHistory.findFirst({
    where: { weekYear, weekNumber, status: "SUCCESS", partial: false },
    orderBy: { sentAt: "desc" },
    include: { planningVersion: true },
  });
}

export async function hasPendingResend(weekYear: number, weekNumber: number): Promise<boolean> {
  const lastSend = await getLastSuccessfulSend(weekYear, weekNumber);
  if (!lastSend) return false;
  const currentHash = await getWeekHash(weekYear, weekNumber);
  if (!lastSend.planningVersion) return true;
  return lastSend.planningVersion.contentHash !== currentHash;
}
