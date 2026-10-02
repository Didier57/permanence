import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { T } from "@/components/locale-provider";
import { Card } from "@/components/ui";
import { getCurrentAccount, isManagerRole } from "@/lib/auth";
import { dateKey, toUTCDateOnly } from "@/lib/date";
import { prisma } from "@/lib/db";
import { nextSlotDateKey, targetWeek } from "@/worker/schedule";
import { EmailConfigForm, type EmailConfigView } from "./email-config-form";
import { ManualSendForm } from "./manual-send-form";
import { SchedulerStatus, FRESH_MINUTES, type SchedulerSlotView } from "./scheduler-status";

export const metadata = { title: "Emails / SMTP - Permanence" };

const EMPTY_CONFIG: EmailConfigView = {
  smtpHost: "",
  smtpPort: 587,
  smtpEncryption: "STARTTLS",
  smtpUser: null,
  fromAddress: "",
  fromName: null,
  replyTo: null,
  ccRecipients: [],
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
  timezone: "Europe/Paris",
  enabled: false,
  hasPassword: false,
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
        smtpHost: record.smtpHost,
        smtpPort: record.smtpPort,
        smtpEncryption: record.smtpEncryption,
        smtpUser: record.smtpUser,
        fromAddress: record.fromAddress,
        fromName: record.fromName,
        replyTo: record.replyTo,
        ccRecipients: record.ccRecipients,
        schedules: scheduleRows,
        timezone: record.timezone,
        enabled: record.enabled,
        hasPassword: Boolean(record.smtpPasswordEncrypted),
        introHtml: record.introHtml ?? "",
        outroHtml: record.outroHtml ?? "",
      }
    : {
        ...EMPTY_CONFIG,
        schedules: scheduleRows.length > 0 ? scheduleRows : EMPTY_CONFIG.schedules,
      };

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
        const nextKey = nextSlotDateKey(schedule, config.timezone, now);
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
        title={<T msg="Emails / SMTP" />}
        description={
          isAdmin ? (
            <T msg="Configuration du serveur SMTP et envoi des plannings aux personnes concernees." />
          ) : (
            <T msg="Envoi des plannings aux personnes concernees." />
          )
        }
      />
      <main className="flex flex-1 flex-col gap-6 p-6">
        {isAdmin ? (
          <Card className="p-6">
            <h2 className="mb-4 text-base font-semibold text-slate-800">
              <T msg="Configuration SMTP" />
            </h2>
            <EmailConfigForm config={config} accountEmail={account.email} directory={directory} />
          </Card>
        ) : null}

        {isAdmin ? (
          <SchedulerStatus
            status={{
              timezone: config.timezone,
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
