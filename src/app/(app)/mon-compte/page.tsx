import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { LanguageSelect } from "@/components/language-select";
import { T } from "@/components/locale-provider";
import { Card } from "@/components/ui";
import { getCurrentAccount } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/roles";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "Mon compte - Permanence" };

export default async function MonComptePage() {
  const account = await getCurrentAccount();
  if (!account) redirect("/login");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={<T msg="Mon compte" />}
        description={<T msg="Informations de connexion et mot de passe." />}
      />

      <Card className="p-5">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Email</dt>
            <dd className="font-medium text-slate-900">{account.email}</dd>
          </div>
          <div>
            <dt className="text-slate-500">
              <T msg="Nom affiche" />
            </dt>
            <dd className="font-medium text-slate-900">{account.displayName ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">
              <T msg="Droits" />
            </dt>
            <dd className="font-medium text-slate-900">
              <T msg={ROLE_LABELS[account.role]} />
            </dd>
          </div>
          <div>
            <LanguageSelect id="account-locale" />
          </div>
        </dl>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 text-base font-semibold text-slate-900">
          <T msg="Modifier mon mot de passe" />
        </h2>
        <PasswordForm />
      </Card>
    </div>
  );
}
