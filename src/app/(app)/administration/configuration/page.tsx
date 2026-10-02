import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { T } from "@/components/locale-provider";
import { Card } from "@/components/ui";
import { getCurrentAccount } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, ROLE_ORDER, roleSortIndex } from "@/lib/roles";
import { AccountManager, type AccountView, type PersonOption } from "./account-manager";
import { SiteUrlForm } from "./site-url-form";
import { getAppConfiguration, getAppUrl } from "@/server/services/app-config";

export const metadata = { title: "Configuration - Permanence" };

export default async function ConfigurationPage() {
  const account = await getCurrentAccount();
  if (!account || account.role !== "ADMIN") {
    redirect("/planning");
  }

  const [accounts, users, appConfiguration, effectiveUrl] = await Promise.all([
    prisma.account.findMany({
      orderBy: [{ email: "asc" }],
      include: { user: { select: { firstName: true, lastName: true } } },
    }),
    prisma.user.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
    getAppConfiguration(),
    getAppUrl(),
  ]);

  const accountViews: AccountView[] = accounts
    .map((item) => ({
      id: item.id,
      email: item.email,
      displayName: item.displayName,
      role: item.role,
      active: item.active,
      userId: item.userId,
      userName: item.user ? `${item.user.firstName} ${item.user.lastName}` : null,
    }))
    .sort(
      (a, b) => roleSortIndex(a.role) - roleSortIndex(b.role) || a.email.localeCompare(b.email),
    );

  const people: PersonOption[] = users.map((user) => ({
    id: user.id,
    label: `${user.lastName} ${user.firstName}`,
  }));

  return (
    <>
      <PageHeader
        title={<T msg="Configuration" />}
        description={
          <T msg="Comptes d'acces et droits (administrateur, gestionnaire ou utilisateur simple)." />
        }
      />
      <main className="flex flex-1 flex-col gap-6 p-6">
        <Card className="p-6">
          <h2 className="mb-2 text-base font-semibold text-slate-800">
            <T msg="Adresse du site" />
          </h2>
          <p className="mb-4 text-sm text-slate-500">
            <T msg="Adresse publique de l'application, utilisee dans les liens d'activation et de reinitialisation envoyes par email. Si elle n'est pas renseignee ici, la valeur par defaut du serveur est utilisee." />
          </p>
          <SiteUrlForm
            configuredUrl={appConfiguration?.appUrl ?? ""}
            effectiveUrl={effectiveUrl}
            callCenterEmail={appConfiguration?.callCenterEmail ?? ""}
          />
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-base font-semibold text-slate-800">
            <T msg="Comptes et droits" />
          </h2>
          <AccountManager
            accounts={accountViews}
            people={people}
            currentAccountId={account.id}
          />
        </Card>

        <Card className="p-6">
          <h2 className="mb-2 text-base font-semibold text-slate-800">
            <T msg="Informations" />
          </h2>
          <dl className="grid gap-2 text-sm text-slate-600 md:grid-cols-2">
            <div>
              <dt className="font-medium text-slate-700">
                <T msg="Numeros de semaine" />
              </dt>
              <dd>
                <T msg="Norme ISO 8601, lundi comme premier jour." />
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-700">
                <T msg="Fuseau horaire d'envoi" />
              </dt>
              <dd>
                <T msg="Configure dans le module Emails / SMTP." />
              </dd>
            </div>
            {ROLE_ORDER.map((role) => (
              <div key={role}>
                <dt className="font-medium text-slate-700">
                  <T msg={ROLE_LABELS[role]} />
                </dt>
                <dd>
                  <T msg={ROLE_DESCRIPTIONS[role]} />
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      </main>
    </>
  );
}
