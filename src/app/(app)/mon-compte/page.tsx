import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui";
import { getCurrentAccount } from "@/lib/auth";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "Mon compte - Permanence" };

export default async function MonComptePage() {
  const account = await getCurrentAccount();
  if (!account) redirect("/login");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Mon compte"
        description="Informations de connexion et mot de passe."
      />

      <Card className="p-5">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Email</dt>
            <dd className="font-medium text-slate-900">{account.email}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Nom affiche</dt>
            <dd className="font-medium text-slate-900">{account.displayName ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Droits</dt>
            <dd className="font-medium text-slate-900">
              {account.role === "ADMIN" ? "Administrateur" : "Utilisateur"}
            </dd>
          </div>
        </dl>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Modifier mon mot de passe</h2>
        <PasswordForm />
      </Card>
    </div>
  );
}
