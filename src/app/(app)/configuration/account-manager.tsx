"use client";

import { useActionState, useState } from "react";
import { Alert, Button, Card, Field, Input, Select } from "@/components/ui";
import { deleteAccount, saveAccount, type AccountActionState } from "@/server/account-actions";

export type AccountView = {
  id: string;
  email: string;
  displayName: string | null;
  role: "ADMIN" | "USER";
  active: boolean;
  userId: string | null;
  userName: string | null;
};

export type PersonOption = { id: string; label: string };

const INITIAL: AccountActionState = {};

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

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      {account ? <input type="hidden" name="id" value={account.id} /> : null}
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Adresse email (identifiant)" htmlFor="email">
          <Input id="email" name="email" type="email" defaultValue={account?.email ?? ""} required />
        </Field>
        <Field label="Nom affiche" htmlFor="displayName">
          <Input id="displayName" name="displayName" defaultValue={account?.displayName ?? ""} />
        </Field>
        <Field label="Role" htmlFor="role">
          <Select id="role" name="role" defaultValue={account?.role ?? "USER"}>
            <option value="USER">Utilisateur simple</option>
            <option value="ADMIN">Administrateur</option>
          </Select>
        </Field>
        <Field
          label="Personne liee"
          htmlFor="userId"
          hint="Optionnel : relie ce compte a une personne du planning."
        >
          <Select id="userId" name="userId" defaultValue={account?.userId ?? ""}>
            <option value="">Aucune</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>{person.label}</option>
            ))}
          </Select>
        </Field>
        <Field
          label={account ? "Nouveau mot de passe" : "Mot de passe"}
          htmlFor="password"
          hint={account ? "Laisser vide pour conserver le mot de passe actuel." : "8 caracteres minimum."}
        >
          <Input id="password" name="password" type="password" autoComplete="new-password" />
        </Field>
        <Field label="Etat" htmlFor="active">
          <label className="flex h-[38px] items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" id="active" name="active" defaultChecked={account?.active ?? true} className="h-4 w-4" />
            Compte actif
          </label>
        </Field>
      </div>

      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement..." : account ? "Mettre a jour" : "Creer le compte"}
        </Button>
        <Button type="button" variant="ghost" onClick={onClose}>
          Fermer
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
          <Button onClick={() => setCreating(true)}>Nouveau compte</Button>
        </div>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Nom affiche</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Personne liee</th>
              <th className="px-4 py-3">Etat</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-800">{account.email}</td>
                <td className="px-4 py-3 text-slate-600">{account.displayName ?? "-"}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      account.role === "ADMIN"
                        ? "rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700"
                        : "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                    }
                  >
                    {account.role === "ADMIN" ? "Administrateur" : "Utilisateur"}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{account.userName ?? "-"}</td>
                <td className="px-4 py-3 text-slate-600">{account.active ? "Actif" : "Inactif"}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => setEditing(account)}>
                      Modifier
                    </Button>
                    {account.id === currentAccountId ? null : (
                      <form action={deleteAccount}>
                        <input type="hidden" name="id" value={account.id} />
                        <Button
                          type="submit"
                          variant="danger"
                          onClick={(event) => {
                            if (!window.confirm("Supprimer ce compte ?")) event.preventDefault();
                          }}
                        >
                          Supprimer
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
