"use client";

import { useActionState, useState } from "react";
import { RichTextEditor } from "@/components/rich-text-editor";
import { useTranslations } from "@/components/locale-provider";
import { PlusIcon, TrashIcon } from "@/components/icons";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { saveEmailConfiguration, type EmailActionState } from "@/server/email-actions";

export type EmailScheduleKind = "PERSONNEL" | "CALLCENTER";

export type EmailScheduleView = {
  id: string;
  dayOfWeek: number;
  sendTime: string;
  weekOffset: number;
  enabled: boolean;
  kind: EmailScheduleKind;
  extraRecipients: string[];
  publicToken: string | null;
};

export type EmailConfigView = {
  schedules: EmailScheduleView[];
  enabled: boolean;
  introHtml: string;
  outroHtml: string;
};

export type DirectoryUser = { id: string; name: string; email: string };

const INITIAL: EmailActionState = {};
const DAYS = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
  { value: 0, label: "Dimanche" },
];
const WEEK_OFFSETS = [
  { value: 1, label: "Semaine suivante" },
  { value: 0, label: "Semaine en cours" },
];
const KINDS: { value: EmailScheduleKind; label: string }[] = [
  { value: "PERSONNEL", label: "Personnel" },
  { value: "CALLCENTER", label: "CallCenter" },
];

function newSchedule(dayOfWeek = 1): EmailScheduleView {
  return {
    id: "",
    dayOfWeek,
    sendTime: "09:00",
    weekOffset: 1,
    enabled: true,
    kind: "PERSONNEL",
    extraRecipients: [],
    publicToken: null,
  };
}

export function EmailConfigForm({
  config,
  directory,
}: {
  config: EmailConfigView;
  directory: DirectoryUser[];
}) {
  const [state, formAction, pending] = useActionState(saveEmailConfiguration, INITIAL);
  const [schedules, setSchedules] = useState<EmailScheduleView[]>(config.schedules);
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);
  const t = useTranslations();

  function updateSchedule(index: number, patch: Partial<EmailScheduleView>) {
    setSchedules((current) =>
      current.map((schedule, position) =>
        position === index ? { ...schedule, ...patch } : schedule,
      ),
    );
  }

  function removeSchedule(index: number) {
    setSchedules((current) => current.filter((_, position) => position !== index));
  }

  function addSchedule() {
    setSchedules((current) => [...current, newSchedule()]);
  }

  function toggleRecipient(index: number, email: string) {
    setSchedules((current) =>
      current.map((schedule, position) => {
        if (position !== index) return schedule;
        const has = schedule.extraRecipients.includes(email);
        return {
          ...schedule,
          extraRecipients: has
            ? schedule.extraRecipients.filter((item) => item !== email)
            : [...schedule.extraRecipients, email],
        };
      }),
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="schedules" value={JSON.stringify(schedules)} />

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">{t("Envoi automatique")}</h3>
              <p className="text-xs text-slate-500">
                {t("Programmez un ou plusieurs envois. Chaque creneau envoie le planning une seule fois.")}
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" name="enabled" defaultChecked={config.enabled} className="h-4 w-4" />
              {t("Active")}
            </label>
          </div>

          <div className="flex flex-col gap-3">
            {schedules.length === 0 ? (
              <p className="text-sm text-slate-500">{t("Aucun creneau programme.")}</p>
            ) : null}
            {schedules.map((schedule, index) => (
              <div
                key={`${schedule.id}-${index}`}
                className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
              >
                <div className="grid items-end gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1fr)_auto_auto]">
                  <Field label={t("Jour d'envoi")}>
                    <Select
                      value={schedule.dayOfWeek}
                      onChange={(event) => updateSchedule(index, { dayOfWeek: Number(event.target.value) })}
                    >
                      {DAYS.map((day) => (
                        <option key={day.value} value={day.value}>{t(day.label)}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label={t("Heure d'envoi")}>
                    <Input
                      type="time"
                      value={schedule.sendTime}
                      onChange={(event) => updateSchedule(index, { sendTime: event.target.value })}
                      required
                    />
                  </Field>
                  <Field label={t("Planning vise")}>
                    <Select
                      value={schedule.weekOffset}
                      onChange={(event) => updateSchedule(index, { weekOffset: Number(event.target.value) })}
                    >
                      {WEEK_OFFSETS.map((offset) => (
                        <option key={offset.value} value={offset.value}>{t(offset.label)}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label={t("Type de planning")}>
                    <Select
                      value={schedule.kind}
                      onChange={(event) =>
                        updateSchedule(index, { kind: event.target.value as EmailScheduleKind })
                      }
                    >
                      {KINDS.map((kind) => (
                        <option key={kind.value} value={kind.value}>{t(kind.label)}</option>
                      ))}
                    </Select>
                  </Field>
                  <label className="flex h-[38px] items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={schedule.enabled}
                      onChange={(event) => updateSchedule(index, { enabled: event.target.checked })}
                      className="h-4 w-4"
                    />
                    {t("Active")}
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => removeSchedule(index)}
                    title={t("Supprimer le creneau")}
                    aria-label={t("Supprimer le creneau")}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setPickerIndex(index)}
                  >
                    {t("Destinataires supplementaires")}
                    {schedule.extraRecipients.length > 0
                      ? ` (${schedule.extraRecipients.length})`
                      : ""}
                  </Button>
                  <span className="text-xs text-slate-500">
                    {schedule.kind === "CALLCENTER"
                      ? t("Recevront le lien vers le planning, sans login.")
                      : t("Recevront l'email avec le planning.")}
                  </span>
                </div>

                {schedule.extraRecipients.length > 0 ? (
                  <p className="text-xs text-slate-500">
                    {schedule.extraRecipients.join(", ")}
                  </p>
                ) : null}

                {schedule.kind === "CALLCENTER" ? (
                  <div className="rounded-md border border-slate-200 bg-white p-2">
                    <p className="mb-1 text-xs font-medium text-slate-600">{t("Lien public")}</p>
                    {schedule.publicToken ? (
                      <code className="block break-all text-xs text-sky-700">
                        {`/public/semaine/${schedule.publicToken}`}
                      </code>
                    ) : (
                      <p className="text-xs text-slate-400">
                        {t("Le lien sera genere a l'enregistrement.")}
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            ))}
            <div>
              <Button type="button" variant="secondary" onClick={addSchedule}>
                <PlusIcon className="h-4 w-4" />
                {t("Ajouter un creneau")}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-slate-200 pt-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">{t("Modele du message")}</h3>
            <p className="text-xs text-slate-500">
              {t("Ces textes sont inseres dans l'email, au-dessus puis en dessous du planning. Laissez vide pour ne rien ajouter.")}
            </p>
          </div>
          <Field
            label={t("Texte au-dessus du planning")}
            hint={t("Insere juste apres le numero de semaine et les dates, avant la liste des groupes.")}
          >
            <RichTextEditor
              name="introHtml"
              defaultValue={config.introHtml}
              placeholder={t("Ex. Merci de prevenir en cas d'empechement.")}
            />
          </Field>
          <Field
            label={t("Texte en dessous du planning")}
            hint={t("Insere apres la liste des groupes, en fin d'email.")}
          >
            <RichTextEditor
              name="outroHtml"
              defaultValue={config.outroHtml}
              placeholder={t("Ex. Contact : responsable@exemple.fr")}
            />
          </Field>
        </div>

        {state.error ? <Alert tone="error">{t(state.error)}</Alert> : null}
        {state.ok && state.message ? <Alert tone="success">{t(state.message)}</Alert> : null}

        <div>
          <Button type="submit" disabled={pending}>
            {pending ? t("Enregistrement...") : t("Enregistrer la configuration")}
          </Button>
        </div>
      </form>

      {pickerIndex !== null && schedules[pickerIndex] ? (
        <ScheduleRecipientPicker
          users={directory}
          selected={schedules[pickerIndex].extraRecipients}
          onToggle={(email) => toggleRecipient(pickerIndex, email)}
          onToggleAll={(select) => {
            setSchedules((current) =>
              current.map((schedule, position) =>
                position === pickerIndex
                  ? { ...schedule, extraRecipients: select ? directory.map((u) => u.email) : [] }
                  : schedule,
              ),
            );
          }}
          onClose={() => setPickerIndex(null)}
        />
      ) : null}
    </div>
  );
}

function ScheduleRecipientPicker({
  users,
  selected,
  onToggle,
  onToggleAll,
  onClose,
}: {
  users: DirectoryUser[];
  selected: string[];
  onToggle: (email: string) => void;
  onToggleAll: (select: boolean) => void;
  onClose: () => void;
}) {
  const t = useTranslations();
  const allSelected = users.length > 0 && users.every((user) => selected.includes(user.email));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">
            {t("Destinataires supplementaires")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700"
            aria-label={t("Fermer")}
          >
            &times;
          </button>
        </div>
        <label className="mb-2 flex items-center gap-2 border-b border-slate-100 pb-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(event) => onToggleAll(event.target.checked)}
            className="h-4 w-4"
          />
          {t("Tous")}
          <span className="ml-auto text-xs text-slate-400">{users.length}</span>
        </label>
        <div className="max-h-80 overflow-y-auto">
          {users.length === 0 ? (
            <p className="p-2 text-sm text-slate-400">{t("Aucun utilisateur.")}</p>
          ) : (
            users.map((user) => (
              <label
                key={user.id}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(user.email)}
                  onChange={() => onToggle(user.email)}
                  className="h-4 w-4"
                />
                <span className="font-medium text-slate-700">{user.name}</span>
                <span className="ml-auto text-xs text-slate-400">{user.email}</span>
              </label>
            ))
          )}
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <span className="text-xs text-slate-500">
            {t("{count} destinataire(s) selectionne(s).", { count: selected.length })}
          </span>
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("Fermer")}
          </Button>
        </div>
      </div>
    </div>
  );
}
