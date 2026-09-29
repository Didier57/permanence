"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { Alert, Button, Card, Field, Input, Select } from "@/components/ui";
import { deleteUser, saveUser, type ActionState } from "@/server/personnel-actions";

export type UserView = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  proPhone: string | null;
  privatePhone: string | null;
  active: boolean;
  groupIds: string[];
  groups: { id: string; name: string }[];
  permanenceCount: number;
};

export type GroupOption = { id: string; name: string };

const initialState: ActionState = {};

function UserForm({
  user,
  groups,
  onDone,
}: {
  user: UserView | null;
  groups: GroupOption[];
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(saveUser, initialState);

  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);

  return (
    <Card className="p-4">
      <h2 className="mb-3 text-base font-semibold text-slate-800">
        {user ? `Modifier ${user.firstName} ${user.lastName}` : "Nouvelle personne"}
      </h2>
      <form action={action} className="flex flex-col gap-3">
        {user ? <input type="hidden" name="id" value={user.id} /> : null}

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Prenom" htmlFor="firstName">
            <Input id="firstName" name="firstName" defaultValue={user?.firstName ?? ""} required maxLength={100} />
          </Field>
          <Field label="Nom" htmlFor="lastName">
            <Input id="lastName" name="lastName" defaultValue={user?.lastName ?? ""} required maxLength={100} />
          </Field>
          <Field label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" defaultValue={user?.email ?? ""} required />
          </Field>
          <Field label="Telephone professionnel" htmlFor="proPhone">
            <Input id="proPhone" name="proPhone" defaultValue={user?.proPhone ?? ""} />
          </Field>
          <Field label="Telephone prive" htmlFor="privatePhone">
            <Input id="privatePhone" name="privatePhone" defaultValue={user?.privatePhone ?? ""} />
          </Field>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-slate-700">Groupes</legend>
          {groups.length === 0 ? (
            <p className="text-sm text-slate-400">Aucun groupe disponible.</p>
          ) : (
            <div className="grid grid-cols-1 gap-1 rounded-md border border-slate-200 p-2 sm:grid-cols-2 lg:grid-cols-3">
              {groups.map((group) => (
                <label key={group.id} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="groupIds"
                    value={group.id}
                    defaultChecked={user?.groupIds.includes(group.id) ?? false}
                  />
                  {group.name}
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="active" defaultChecked={user?.active ?? true} />
          Actif
        </label>

        {state.error ? <Alert>{state.error}</Alert> : null}

        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Enregistrement..." : "Enregistrer"}
          </Button>
          <Button type="button" variant="secondary" onClick={onDone}>
            Annuler
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function PersonnelManager({
  users,
  groups,
  query,
  groupId,
}: {
  users: UserView[];
  groups: GroupOption[];
  query: string;
  groupId: string;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<UserView | null>(null);

  const close = useCallback(() => {
    setFormOpen(false);
    setEditing(null);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <form method="get" className="flex flex-wrap items-end gap-2">
          <Field label="Recherche" htmlFor="q">
            <Input
              id="q"
              name="q"
              defaultValue={query}
              placeholder="Nom, email, telephone"
              className="w-56"
            />
          </Field>
          <Field label="Groupe" htmlFor="groupId">
            <Select id="groupId" name="groupId" defaultValue={groupId} className="w-48">
              <option value="">Tous les groupes</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="submit" variant="secondary">
            Filtrer
          </Button>
        </form>

        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          Nouvelle personne
        </Button>
      </div>

      {formOpen ? (
        <UserForm key={editing?.id ?? "new"} user={editing} groups={groups} onDone={close} />
      ) : null}

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
              <th className="px-4 py-2">Nom</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Tel. pro</th>
              <th className="px-4 py-2">Tel. prive</th>
              <th className="px-4 py-2">Groupes</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Aucune personne trouvee.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-b border-slate-100 align-top">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {user.lastName} {user.firstName}
                    {!user.active ? (
                      <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                        inactif
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{user.email}</td>
                  <td className="px-4 py-3 text-slate-600">{user.proPhone ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{user.privatePhone ?? "—"}</td>
                  <td className="px-4 py-3">
                    {user.groups.length === 0 ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <span className="flex flex-wrap gap-1">
                        {user.groups.map((group) => (
                          <span
                            key={group.id}
                            className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600"
                          >
                            {group.name}
                          </span>
                        ))}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setEditing(user);
                          setFormOpen(true);
                        }}
                      >
                        Modifier
                      </Button>
                      <form
                        action={deleteUser}
                        onSubmit={(event) => {
                          const message =
                            user.permanenceCount > 0
                              ? `${user.firstName} ${user.lastName} possede des permanences historiques : il sera desactive. Continuer ?`
                              : `Supprimer ${user.firstName} ${user.lastName} ?`;
                          if (!confirm(message)) event.preventDefault();
                        }}
                      >
                        <input type="hidden" name="id" value={user.id} />
                        <Button type="submit" variant="danger">
                          {user.permanenceCount > 0 ? "Desactiver" : "Supprimer"}
                        </Button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
