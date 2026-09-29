import { redirect } from "next/navigation";
import { getCurrentAccount } from "@/lib/auth";
import {
  dateKey,
  endOfISOWeek,
  fromDateInput,
  getISOWeekInfo,
  monthEnd,
  monthStart,
  startOfISOWeek,
} from "@/lib/date";
import { prisma } from "@/lib/db";
import { hasPendingResend } from "@/server/services/planning";
import { PlanningView, type EntryMap, type PlanningGroup, type UserInfo } from "./planning-view";

export const metadata = { title: "Planning - Permanence" };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function PlanningPage({ searchParams }: PageProps<"/planning">) {
  const account = await getCurrentAccount();
  if (!account) {
    redirect("/login");
  }

  const sp = await searchParams;
  const view = sp.view === "month" ? "month" : "week";
  const anchorRaw =
    typeof sp.date === "string" && DATE_RE.test(sp.date) ? sp.date : dateKey(new Date());
  const anchorDate = fromDateInput(anchorRaw);

  const range =
    view === "month"
      ? {
          start: startOfISOWeek(monthStart(anchorDate.getUTCFullYear(), anchorDate.getUTCMonth())),
          end: endOfISOWeek(monthEnd(anchorDate.getUTCFullYear(), anchorDate.getUTCMonth())),
        }
      : { start: startOfISOWeek(anchorDate), end: endOfISOWeek(anchorDate) };

  const [groups, permanences, users] = await Promise.all([
    prisma.group.findMany({
      orderBy: { name: "asc" },
      include: {
        members: {
          include: { user: { select: { id: true, firstName: true, lastName: true, active: true } } },
        },
      },
    }),
    prisma.permanence.findMany({
      where: { date: { gte: range.start, lte: range.end } },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        proPhone: true,
        privatePhone: true,
        memberships: { select: { group: { select: { name: true } } } },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
  ]);

  const directory: Record<string, UserInfo> = {};
  for (const user of users) {
    directory[user.id] = {
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      proPhone: user.proPhone,
      privatePhone: user.privatePhone,
      groups: user.memberships
        .map((membership) => membership.group.name)
        .sort((a, b) => a.localeCompare(b)),
    };
  }

  const planningGroups: PlanningGroup[] = groups.map((group) => ({
    id: group.id,
    name: group.name,
    description: group.description,
    color: group.color,
    members: group.members
      .filter((member) => member.user.active)
      .map((member) => ({
        id: member.user.id,
        name: `${member.user.firstName} ${member.user.lastName}`,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  }));

  const entries: EntryMap = {};
  for (const permanence of permanences) {
    const key = dateKey(permanence.date);
    entries[key] = entries[key] ?? {};
    entries[key][permanence.groupId] = {
      userId: permanence.userId,
      userName: `${permanence.user.firstName} ${permanence.user.lastName}`,
    };
  }

  const canEdit = account.role !== "USER";
  let pendingResend: { weekYear: number; weekNumber: number } | null = null;
  if (canEdit && view === "week") {
    const info = getISOWeekInfo(anchorDate);
    const pending = await hasPendingResend(info.weekYear, info.weekNumber);
    if (pending) pendingResend = { weekYear: info.weekYear, weekNumber: info.weekNumber };
  }

  return (
    <PlanningView
      view={view}
      anchor={anchorRaw}
      canEdit={canEdit}
      groups={planningGroups}
      entries={entries}
      pendingResend={pendingResend}
      directory={directory}
    />
  );
}
