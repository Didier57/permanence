"use client";

import { useActionState, useState } from "react";
import { RichTextEditor } from "@/components/rich-text-editor";
import { useTranslations } from "@/components/locale-provider";
import { PlusIcon, TrashIcon } from "@/components/icons";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import {
  saveEmailConfiguration,
  testEmailConfiguration,
  type EmailActionState,
} from "@/server/email-actions";

export type EmailScheduleView = {
  id: string;
  dayOfWeek: number;
  sendTime: string;
  weekOffset: number;
  enabled: boolean;
};

export type EmailConfigView = {
  smtpHost: string;
  smtpPort: number;
  smtpEncryption: "NONE" | "STARTTLS" | "SSL";
  smtpUser: string | null;
  fromAddress: string;
  fromName: string | null;
  replyTo: string | null;
  ccRecipients: string[];
  schedules: EmailScheduleView[];
  timezone: string;
  enabled: boolean;
  hasPassword: boolean;
  introHtml: string;
  outroHtml: string;
};

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

function newSchedule(dayOfWeek = 1): EmailScheduleView {
  return { id: "", dayOfWeek, sendTime: "09:00", weekOffset: 1, enabled: true };
}

export function EmailConfigForm({
  config,
  accountEmail,
}: {
  config: EmailConfigView;
  accountEmail: string;
}) {
  const [state, formAction, pending] = useActionState(saveEmailConfiguration, INITIAL);
  const [testState, testAction, testPending] = useActionState(testEmailConfiguration, INITIAL);
  const [schedules, setSchedules] = useState<EmailScheduleView[]>(config.schedules);
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

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="schedules" value={JSON.stringify(schedules)} />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t("Serveur SMTP")} htmlFor="smtpHost">
            <Input id="smtpHost" name="smtpHost" defaultValue={config.smtpHost} required />
          </Field>
          <Field label={t("Port")} htmlFor="smtpPort">
            <Input id="smtpPort" name="smtpPort" type="number" defaultValue={config.smtpPort} required />
          </Field>
          <Field label={t("Chiffrement")} htmlFor="smtpEncryption">
            <Select id="smtpEncryption" name="smtpEncryption" defaultValue={config.smtpEncryption}>
              <option value="STARTTLS">STARTTLS</option>
              <option value="SSL">SSL / TLS</option>
              <option value="NONE">{t("Aucun")}</option>
            </Select>
          </Field>
          <Field label={t("Utilisateur SMTP")} htmlFor="smtpUser">
            <Input id="smtpUser" name="smtpUser" defaultValue={config.smtpUser ?? ""} autoComplete="off" />
          </Field>
          <Field
            label={t("Mot de passe SMTP")}
            htmlFor="smtpPassword"
            hint={
              config.hasPassword
                ? t("Un mot de passe est enregistre. Laisser vide pour le conserver.")
                : t("Aucun mot de passe enregistre.")
            }
          >
            <Input id="smtpPassword" name="smtpPassword" type="password" autoComplete="new-password" placeholder={config.hasPassword ? "********" : ""} />
          </Field>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" name="clearPassword" className="h-4 w-4" />
              {t("Supprimer le mot de passe enregistre")}
            </label>
          </div>
          <Field label={t("Adresse d'expedition")} htmlFor="fromAddress">
            <Input id="fromAddress" name="fromAddress" type="email" defaultValue={config.fromAddress} required />
          </Field>
          <Field label={t("Nom d'expedition")} htmlFor="fromName">
            <Input id="fromName" name="fromName" defaultValue={config.fromName ?? ""} />
          </Field>
          <Field label={t("Adresse de reponse (reply-to)")} htmlFor="replyTo" hint={t("Optionnel")}>
            <Input id="replyTo" name="replyTo" type="email" defaultValue={config.replyTo ?? ""} />
          </Field>
          <Field label={t("Copie (CC)")} htmlFor="ccRecipients" hint={t("Adresses separees par des virgules.")}>
            <Input id="ccRecipients" name="ccRecipients" defaultValue={config.ccRecipients.join(", ")} />
          </Field>
        </div>

        <div className="flex flex-col gap-4 border-t border-slate-200 pt-4">
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

          <div className="grid items-end gap-4 md:grid-cols-2">
            <Field label={t("Fuseau horaire")} htmlFor="timezone">
              <Input id="timezone" name="timezone" defaultValue={config.timezone} required />
            </Field>
          </div>

          <div className="flex flex-col gap-3">
            {schedules.length === 0 ? (
              <p className="text-sm text-slate-500">{t("Aucun creneau programme.")}</p>
            ) : null}
            {schedules.map((schedule, index) => (
              <div
                key={`${schedule.id}-${index}`}
                className="grid items-end gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)_auto_auto]"
              >
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

      <form action={testAction} className="flex flex-col gap-3 border-t border-slate-200 pt-4">
        <div className="grid items-end gap-4 md:grid-cols-[1fr_auto]">
          <Field
            label={t("Destinataire du test")}
            htmlFor="testRecipient"
            hint={t("Par defaut : {email}", { email: accountEmail })}
          >
            <Input id="testRecipient" name="testRecipient" type="email" placeholder={accountEmail} />
          </Field>
          <Button type="submit" variant="secondary" disabled={testPending}>
            {testPending ? t("Test en cours...") : t("Tester la configuration SMTP")}
          </Button>
        </div>
        {testState.error ? <Alert tone="error">{t(testState.error)}</Alert> : null}
        {testState.ok && testState.message ? <Alert tone="success">{t(testState.message)}</Alert> : null}
      </form>
    </div>
  );
}
