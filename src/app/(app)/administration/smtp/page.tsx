import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { T } from "@/components/locale-provider";
import { Card } from "@/components/ui";
import { getCurrentAccount } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SmtpConfigForm, type SmtpConfigView } from "./smtp-config-form";

export const metadata = { title: "SMTP - Permanence" };

const EMPTY_CONFIG: SmtpConfigView = {
  smtpHost: "",
  smtpPort: 587,
  smtpEncryption: "STARTTLS",
  smtpUser: null,
  fromAddress: "",
  fromName: null,
  replyTo: null,
  ccRecipients: [],
  hasPassword: false,
};

export default async function SmtpPage() {
  const account = await getCurrentAccount();
  if (!account || account.role !== "ADMIN") {
    redirect("/planning");
  }

  const record = await prisma.emailConfiguration.findUnique({ where: { id: "default" } });
  const config: SmtpConfigView = record
    ? {
        smtpHost: record.smtpHost,
        smtpPort: record.smtpPort,
        smtpEncryption: record.smtpEncryption,
        smtpUser: record.smtpUser,
        fromAddress: record.fromAddress,
        fromName: record.fromName,
        replyTo: record.replyTo,
        ccRecipients: record.ccRecipients,
        hasPassword: Boolean(record.smtpPasswordEncrypted),
      }
    : EMPTY_CONFIG;

  return (
    <>
      <PageHeader
        title={<T msg="Configuration SMTP" />}
        description={
          <T msg="Serveur d'envoi des emails : connexion, expediteur et test." />
        }
      />
      <main className="flex flex-1 flex-col gap-6 p-6">
        <Card className="p-6">
          <SmtpConfigForm config={config} accountEmail={account.email} />
        </Card>
      </main>
    </>
  );
}
