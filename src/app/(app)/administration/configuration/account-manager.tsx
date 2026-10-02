"use client";

import { useActionState, useState } from "react";
import { Alert, Button, Card, Field, Input, Select } from "@/components/ui";
import { useTranslations } from "@/components/locale-provider";
import { ROLE_LABELS, type AccountRole } from "@/lib/roles";
import { deleteAccount, saveAccount, type AccountActionState } from "@/server/account-actions";

export type AccountView = {
  id: string;
  email: string;
  displayName: string | null;
  role: AccountRole;
  active: boolean;
  userId: string | null;
  userName: string | null;
};

export type PersonOption = { id: string; label: string };

const INITIAL: AccountActionState = {};

const ROLE_BADGE: Record<AccountRole, string> = {
  ADMIN: "rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  MANAGER:
    "rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
  USER: "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600",
};

function AccountForm({
  account,
  people,
  onClose,
}: {
  account: AccountView | null;
  people: PersonOption[];
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveAccount, INITIAL);
  const t = useTranslations();

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      {account ? <input type="hidden" name="id" value={account.id} /> : null}
      <div className="grid gap-3 md:grid-cols-2">
        <Field label={t("Adresse email (identifiant)")} htmlFor="email">
          <Input id="email" name="email" type="email" defaultValue={account?.email ?? ""} required />
        </Field>
        <Field label={t("Nom affiche")} htmlFor="displayName">
          <Input id="displayName" name="displayName" defaultValue={account?.displayName ?? ""} />
        </Field>
        <Field label={t("Role")} htmlFor="role">
          <Select id="role" name="role" defaultValue={account?.role ?? "USER"}>
            <option value="USER">{t("Utilisateur simple (lecture seule)")}</option>
            <option value="MANAGER">{t("Gestionnaire")}</option>
            <option value="ADMIN">{t("Administrateur")}</option>
          </Select>
        </Field>
        <Field
          label={t("Personne liee")}
          htmlFor="userId"
          hint={t("Optionnel : relie ce compte a une personne du planning.")}
        >
          <Select id="userId" name="userId" defaultValue={account?.userId ?? ""}>
            <option value="">{t("Aucune")}</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>{person.label}</option>
            ))}
          </Select>
        </Field>
        <Field
          label={account ? t("Nouveau mot de passe") : t("Mot de passe")}
          htmlFor="password"
          hint={account ? t("Laisser vide pour conserver le mot de passe actuel.") : t("8 caracteres minimum.")}
        >
          <Input id="password" name="password" type="password" autoComplete="new-password" />
        </Field>
        <Field label={t("Etat")} htmlFor="active">
          <label className="flex h-[38px] items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" id="active" name="active" defaultChecked={account?.active ?? true} className="h-4 w-4" />
            {t("Compte actif")}
          </label>
        </Field>
      </div>

      {state.error ? <Alert tone="error">{t(state.error)}</Alert> : null}
      {state.ok && state.message ? <Alert tone="success">{t(state.message)}</Alert> : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? t("Enregistrement...") : account ? t("Mettre a jour") : t("Creer le compte")}
        </Button>
        <Button type="button" variant="ghost" onClick={onClose}>
          {t("Fermer")}
        </Button>
      </div>
    </form>
  );
}

export function AccountManager({
  accounts,
  people,
  currentAccountId,
}: {
  accounts: AccountView[];
  people: PersonOption[];
  currentAccountId: string;
}) {
  const [editing, setEditing] = useState<AccountView | null>(null);
  const [creating, setCreating] = useState(false);
  const t = useTranslations();

  return (
    <div className="flex flex-col gap-4">
      {creating || editing ? (
        <AccountForm
          account={editing}
          people={people}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      ) : (
        <div>
          <Button onClick={() => setCreating(true)}>{t("Nouveau compte")}</Button>
        </div>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">{t("Nom affiche")}</th>
              <th className="px-4 py-3">{t("Role")}</th>
              <th className="px-4 py-3">{t("Personne liee")}</th>
              <th className="px-4 py-3">{t("Etat")}</th>
              <th className="px-4 py-3 text-right">{t("Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-800">{account.email}</td>
                <td className="px-4 py-3 text-slate-600">{account.displayName ?? "-"}</td>
                <td className="px-4 py-3">
                  <span className={ROLE_BADGE[account.role]}>
                    {t(ROLE_LABELS[account.role])}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{account.userName ?? "-"}</td>
                <td className="px-4 py-3 text-slate-600">{account.active ? t("Actif") : t("Inactif")}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => setEditing(account)}>
                      {t("Modifier")}
                    </Button>
                    {account.id === currentAccountId ? null : (
                      <form action={deleteAccount}>
                        <input type="hidden" name="id" value={account.id} />
                        <Button
                          type="submit"
                          variant="danger"
                          onClick={(event) => {
                            if (!window.confirm(t("Supprimer ce compte ?"))) event.preventDefault();
                          }}
                        >
                          {t("Supprimer")}
                        </Button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
