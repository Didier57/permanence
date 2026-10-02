import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { T } from "@/components/locale-provider";
import { Card } from "@/components/ui";
import { getCurrentAccount, isManagerRole } from "@/lib/auth";
import { dateKey, toUTCDateOnly } from "@/lib/date";
import { prisma } from "@/lib/db";
import { nextSlotDateKey, targetWeek } from "@/worker/schedule";
import { getTimezone, getAppUrl } from "@/server/services/app-config";
import { EmailConfigForm, type EmailConfigView } from "./email-config-form";
import { ManualSendForm } from "./manual-send-form";
import { SchedulerStatus, FRESH_MINUTES, type SchedulerSlotView } from "./scheduler-status";

export const metadata = { title: "Emails - Permanence" };

const EMPTY_CONFIG: EmailConfigView = {
  schedules: [
    {
      id: "",
      dayOfWeek: 3,
      sendTime: "09:00",
      weekOffset: 1,
      enabled: true,
      kind: "PERSONNEL",
      extraRecipients: [],
      publicToken: null,
    },
  ],
  enabled: false,
  introHtml: "",
  outroHtml: "",
};

export default async function EmailsPage() {
  const account = await getCurrentAccount();
  if (!account || !isManagerRole(account.role)) {
    redirect("/planning");
  }
  const isAdmin = account.role === "ADMIN";

  const record = isAdmin
    ? await prisma.emailConfiguration.findUnique({ where: { id: "default" } })
    : null;
  const schedules = isAdmin
    ? await prisma.emailSchedule.findMany({
        orderBy: [{ dayOfWeek: "asc" }, { sendTime: "asc" }],
      })
    : [];
  const directoryUsers = isAdmin
    ? await prisma.user.findMany({
        where: { active: true },
        select: { id: true, firstName: true, lastName: true, email: true },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      })
    : [];
  const directory = directoryUsers.map((user) => ({
    id: user.id,
    name: `${user.firstName} ${user.lastName}`,
    email: user.email,
  }));
  const scheduleRows = schedules.map((schedule) => ({
    id: schedule.id,
    dayOfWeek: schedule.dayOfWeek,
    sendTime: schedule.sendTime,
    weekOffset: schedule.weekOffset,
    enabled: schedule.enabled,
    kind: schedule.kind,
    extraRecipients: schedule.extraRecipients,
    publicToken: schedule.publicToken,
  }));
  const config: EmailConfigView = record
    ? {
        schedules: scheduleRows,
        enabled: record.enabled,
        introHtml: record.introHtml ?? "",
        outroHtml: record.outroHtml ?? "",
      }
    : {
        ...EMPTY_CONFIG,
        schedules: scheduleRows.length > 0 ? scheduleRows : EMPTY_CONFIG.schedules,
      };

  const timezone = await getTimezone();
  const appUrl = await getAppUrl();

  const now = new Date();

  const lastAutomaticBySlot = new Map<string, { sentAt: Date; status: string }>();
  if (isAdmin && schedules.length > 0) {
    const recent = await prisma.emailHistory.findMany({
      where: { type: "AUTOMATIC", scheduleId: { in: schedules.map((schedule) => schedule.id) } },
      orderBy: { sentAt: "desc" },
      take: 200,
      select: { scheduleId: true, sentAt: true, status: true },
    });
    for (const entry of recent) {
      if (entry.scheduleId && !lastAutomaticBySlot.has(entry.scheduleId)) {
        lastAutomaticBySlot.set(entry.scheduleId, { sentAt: entry.sentAt, status: entry.status });
      }
    }
  }

  const schedulerSlots: SchedulerSlotView[] = isAdmin
    ? schedules.map((schedule) => {
        const nextKey = nextSlotDateKey(schedule, timezone, now);
        const last = lastAutomaticBySlot.get(schedule.id);
        return {
          id: schedule.id,
          dayOfWeek: schedule.dayOfWeek,
          sendTime: schedule.sendTime,
          weekOffset: schedule.weekOffset,
          enabled: schedule.enabled,
          nextDateKey: nextKey,
          nextWeek: nextKey ? targetWeek(nextKey, schedule.weekOffset) : null,
          lastSentAt: last ? last.sentAt.toISOString() : null,
          lastSentStatus: last ? last.status : null,
          lastSentPartial: false,
        };
      })
    : [];

  const today = dateKey(toUTCDateOnly(new Date()));

  return (
    <>
      <PageHeader
        title={<T msg="Emails" />}
        description={
          isAdmin ? (
            <T msg="Creneaux d'envoi automatique, modele du message et envoi manuel des plannings." />
          ) : (
            <T msg="Envoi des plannings aux personnes concernees." />
          )
        }
      />
      <main className="flex flex-1 flex-col gap-6 p-6">
        {isAdmin ? (
          <Card className="p-6">
            <h2 className="mb-4 text-base font-semibold text-slate-800">
              <T msg="Creneaux et modele du message" />
            </h2>
            <EmailConfigForm config={config} directory={directory} appUrl={appUrl} />
          </Card>
        ) : null}

        {isAdmin ? (
          <SchedulerStatus
            status={{
              timezone,
              enabled: config.enabled,
              lastTickAt: record?.lastTickAt ? record.lastTickAt.toISOString() : null,
              lastTickStatus: record?.lastTickStatus ?? null,
              fresh: record?.lastTickAt
                ? (now.getTime() - record.lastTickAt.getTime()) / 60000 <= FRESH_MINUTES
                : false,
              slots: schedulerSlots,
            }}
          />
        ) : null}

        <Card className="p-6">
          <h2 className="mb-2 text-base font-semibold text-slate-800">
            <T msg="Envoi manuel" />
          </h2>
          <p className="mb-4 text-sm text-slate-500">
            <T msg="Envoie immediatement le planning complet d'une semaine a toutes les personnes concernees." />
          </p>
          <ManualSendForm defaultDate={today} />
        </Card>
      </main>
    </>
  );
}
