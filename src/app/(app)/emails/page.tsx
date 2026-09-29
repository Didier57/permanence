import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui";
import { getCurrentAccount } from "@/lib/auth";
import { dateKey, toUTCDateOnly } from "@/lib/date";
import { prisma } from "@/lib/db";
import { EmailConfigForm, type EmailConfigView } from "./email-config-form";
import { ManualSendForm } from "./manual-send-form";

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
  sendDayOfWeek: 3,
  sendTime: "09:00",
  timezone: "Europe/Paris",
  enabled: false,
  hasPassword: false,
};

export default async function EmailsPage() {
  const account = await getCurrentAccount();
  if (!account || account.role !== "ADMIN") {
    redirect("/planning");
  }

  const record = await prisma.emailConfiguration.findUnique({ where: { id: "default" } });
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
        sendDayOfWeek: record.sendDayOfWeek,
        sendTime: record.sendTime,
        timezone: record.timezone,
        enabled: record.enabled,
        hasPassword: Boolean(record.smtpPasswordEncrypted),
      }
    : EMPTY_CONFIG;

  const today = dateKey(toUTCDateOnly(new Date()));

  return (
    <>
      <PageHeader
        title="Emails / SMTP"
        description="Configuration du serveur SMTP et envoi des plannings aux personnes concernees."
      />
      <main className="flex flex-1 flex-col gap-6 p-6">
        <Card className="p-6">
          <h2 className="mb-4 text-base font-semibold text-slate-800">Configuration SMTP</h2>
          <EmailConfigForm config={config} accountEmail={account.email} />
        </Card>

        <Card className="p-6">
          <h2 className="mb-2 text-base font-semibold text-slate-800">Envoi manuel</h2>
          <p className="mb-4 text-sm text-slate-500">
            Envoie immediatement le planning complet d&apos;une semaine a toutes les personnes concernees.
          </p>
          <ManualSendForm defaultDate={today} />
        </Card>
      </main>
    </>
  );
}
