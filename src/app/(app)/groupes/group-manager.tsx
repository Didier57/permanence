"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { Alert, Button, Card, Field, Input, Textarea } from "@/components/ui";
import { ColorPicker } from "@/components/color-picker";
import { ChevronDownIcon, ChevronUpIcon } from "@/components/icons";
import { useTranslations } from "@/components/locale-provider";
import { deleteGroup, moveGroup, saveGroup, type ActionState } from "@/server/group-actions";

export type GroupView = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  permanenceCount: number;
  memberIds: string[];
  members: { id: string; label: string }[];
};

export type UserOption = {
  id: string;
  label: string;
  email: string;
  active: boolean;
};

const initialState: ActionState = {};

function GroupForm({
  group,
  users,
  onDone,
}: {
  group: GroupView | null;
  users: UserOption[];
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(saveGroup, initialState);
  const t = useTranslations();

  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);

  return (
    <Card className="p-4">
      <h2 className="mb-3 text-base font-semibold text-slate-800">
        {group ? t("Modifier {name}", { name: group.name }) : t("Nouveau groupe")}
      </h2>
      <form action={action} className="flex flex-col gap-3">
        {group ? <input type="hidden" name="id" value={group.id} /> : null}

        <div className="grid gap-3 md:grid-cols-2">
          <Field label={t("Nom")} htmlFor="name">
            <Input id="name" name="name" defaultValue={group?.name ?? ""} required maxLength={100} />
          </Field>
          <Field label={t("Couleur")} htmlFor="color">
            <ColorPicker id="color" name="color" defaultValue={group?.color} />
          </Field>
        </div>

        <Field label={t("Description")} htmlFor="description">
          <Textarea
            id="description"
            name="description"
            rows={2}
            defaultValue={group?.description ?? ""}
            maxLength={500}
          />
        </Field>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-slate-700">{t("Membres")}</legend>
          {users.length === 0 ? (
            <p className="text-sm text-slate-400">{t("Aucune personne disponible.")}</p>
          ) : (
            <div className="grid max-h-60 grid-cols-1 gap-1 overflow-auto rounded-md border border-slate-200 p-2 sm:grid-cols-2 lg:grid-cols-3">
              {users.map((user) => (
                <label key={user.id} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="memberIds"
                    value={user.id}
                    defaultChecked={group?.memberIds.includes(user.id) ?? false}
                  />
                  <span>
                    {user.label}
                    {!user.active ? (
                      <span className="ml-1 text-xs text-slate-400">{t("(inactif)")}</span>
                    ) : null}
                  </span>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        {state.error ? <Alert>{t(state.error)}</Alert> : null}

        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? t("Enregistrement...") : t("Enregistrer")}
          </Button>
          <Button type="button" variant="secondary" onClick={onDone}>
            {t("Annuler")}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function GroupManager({ groups, users }: { groups: GroupView[]; users: UserOption[] }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<GroupView | null>(null);
  const t = useTranslations();

  const close = useCallback(() => {
    setFormOpen(false);
    setEditing(null);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          {t("Nouveau groupe")}
        </Button>
      </div>

      {formOpen ? (
        <GroupForm key={editing?.id ?? "new"} group={editing} users={users} onDone={close} />
      ) : null}

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
              <th className="px-2 py-2">
                <span className="sr-only">{t("Ordre")}</span>
              </th>
              <th className="px-4 py-2">{t("Groupe")}</th>
              <th className="px-4 py-2">{t("Description")}</th>
              <th className="px-4 py-2">{t("Membres")}</th>
              <th className="px-4 py-2">{t("Permanences")}</th>
              <th className="px-4 py-2 text-right">{t("Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  {t("Aucun groupe pour le moment.")}
                </td>
              </tr>
            ) : (
              groups.map((group, index) => (
                <tr key={group.id} className="border-b border-slate-100 align-top">
                  <td className="px-2 py-3">
                    <div className="flex flex-col gap-1">
                      <form action={moveGroup}>
                        <input type="hidden" name="id" value={group.id} />
                        <input type="hidden" name="direction" value="up" />
                        <button
                          type="submit"
                          disabled={index === 0}
                          title={t("Monter")}
                          aria-label={t("Monter")}
                          className="rounded-md p-0.5 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ChevronUpIcon className="h-4 w-4" />
                        </button>
                      </form>
                      <form action={moveGroup}>
                        <input type="hidden" name="id" value={group.id} />
                        <input type="hidden" name="direction" value="down" />
                        <button
                          type="submit"
                          disabled={index === groups.length - 1}
                          title={t("Descendre")}
                          aria-label={t("Descendre")}
                          className="rounded-md p-0.5 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ChevronDownIcon className="h-4 w-4" />
                        </button>
                      </form>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-full border border-slate-300"
                        style={{ backgroundColor: group.color ?? "#cbd5e1" }}
                      />
                      {group.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{group.description ?? "—"}</td>
                  <td className="px-4 py-3">
                    {group.members.length === 0 ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <span className="flex flex-wrap gap-1">
                        {group.members.map((member) => (
                          <span
                            key={member.id}
                            className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600"
                          >
                            {member.label}
                          </span>
                        ))}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{group.permanenceCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setEditing(group);
                          setFormOpen(true);
                        }}
                      >
                        {t("Modifier")}
                      </Button>
                      <form
                        action={deleteGroup}
                        onSubmit={(event) => {
                          if (!confirm(t("Supprimer le groupe {name} ?", { name: group.name }))) {
                            event.preventDefault();
                          }
                        }}
                      >
                        <input type="hidden" name="id" value={group.id} />
                        <Button
                          type="submit"
                          variant="danger"
                          disabled={group.permanenceCount > 0}
                          title={
                            group.permanenceCount > 0
                              ? t("Des permanences existent pour ce groupe")
                              : undefined
                          }
                        >
                          {t("Supprimer")}
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
