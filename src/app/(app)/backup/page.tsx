import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Card, LinkButton } from "@/components/ui";
import { getCurrentAccount } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { RestoreForm } from "./restore-form";

export const metadata = { title: "Sauvegarde - Permanence" };

export default async function BackupPage() {
  const account = await getCurrentAccount();
  if (!account || account.role !== "ADMIN") {
    redirect("/planning");
  }

  const [userCount, groupCount, membershipCount, permanenceCount, emailConfig, appConfig] =
    await Promise.all([
      prisma.user.count(),
      prisma.group.count(),
      prisma.userGroup.count(),
      prisma.permanence.count(),
      prisma.emailConfiguration.findUnique({
        where: { id: "default" },
        select: { smtpHost: true, enabled: true },
      }),
      prisma.appConfiguration.findUnique({ where: { id: "default" }, select: { appUrl: true } }),
    ]);

  return (
    <>
      <PageHeader
        title="Sauvegarde"
        description="Export et restauration des donnees de l'application."
      />
      <main className="flex flex-1 flex-col gap-6 p-6">
        <Card className="p-6">
          <h2 className="mb-2 text-base font-semibold text-slate-800">Contenu de la sauvegarde</h2>
          <p className="mb-4 text-sm text-slate-500">
            Le fichier exporte contient le personnel, les groupes et leurs affectations, le
            planning des permanences, la configuration du site (identifiants SMTP chiffres,
            expediteur, CC, jour et heure d&apos;envoi) ainsi que l&apos;adresse publique.
            Les comptes d&apos;acces et l&apos;historique des emails ne sont pas inclus.
          </p>
          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-md bg-slate-50 p-3">
              <dt className="text-slate-500">Personnes</dt>
              <dd className="text-lg font-semibold text-slate-900">{userCount}</dd>
            </div>
            <div className="rounded-md bg-slate-50 p-3">
              <dt className="text-slate-500">Groupes</dt>
              <dd className="text-lg font-semibold text-slate-900">
                {groupCount}
                <span className="ml-1 text-xs font-normal text-slate-500">
                  ({membershipCount} affectations)
                </span>
              </dd>
            </div>
            <div className="rounded-md bg-slate-50 p-3">
              <dt className="text-slate-500">Permanences</dt>
              <dd className="text-lg font-semibold text-slate-900">{permanenceCount}</dd>
            </div>
            <div className="rounded-md bg-slate-50 p-3">
              <dt className="text-slate-500">Configuration email</dt>
              <dd className="text-lg font-semibold text-slate-900">
                {emailConfig?.smtpHost ? (emailConfig.enabled ? "Activee" : "Enregistree") : "Aucune"}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-slate-500">
            Adresse publique configuree : {appConfig?.appUrl ?? "valeur par defaut du serveur"}
          </p>
          <div className="mt-5">
            <LinkButton href="/api/backup" download>
              Telecharger la sauvegarde
            </LinkButton>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-2 text-base font-semibold text-slate-800">Restaurer une sauvegarde</h2>
          <p className="mb-4 text-sm text-slate-500">
            La restauration remplace ou met a jour les personnes, groupes et permanences. Les
            comptes d&apos;acces restent inchanges ; un compte dont la personne est retrouvee par
            son email est automatiquement relie a nouveau.
          </p>
          <RestoreForm />
        </Card>
      </main>
    </>
  );
}
