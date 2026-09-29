"use client";

import { useActionState } from "react";
import { RichTextEditor } from "@/components/rich-text-editor";
import { useTranslations } from "@/components/locale-provider";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import {
  saveEmailConfiguration,
  testEmailConfiguration,
  type EmailActionState,
} from "@/server/email-actions";

export type EmailConfigView = {
  smtpHost: string;
  smtpPort: number;
  smtpEncryption: "NONE" | "STARTTLS" | "SSL";
  smtpUser: string | null;
  fromAddress: string;
  fromName: string | null;
  replyTo: string | null;
  ccRecipients: string[];
  sendDayOfWeek: number;
  sendTime: string;
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

export function EmailConfigForm({
  config,
  accountEmail,
}: {
  config: EmailConfigView;
  accountEmail: string;
}) {
  const [state, formAction, pending] = useActionState(saveEmailConfiguration, INITIAL);
  const [testState, testAction, testPending] = useActionState(testEmailConfiguration, INITIAL);
  const t = useTranslations();

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} className="flex flex-col gap-4">
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

        <div className="grid gap-4 md:grid-cols-4">
          <Field label={t("Envoi automatique")} htmlFor="enabled">
            <label className="flex h-[38px] items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" id="enabled" name="enabled" defaultChecked={config.enabled} className="h-4 w-4" />
              {t("Active")}
            </label>
          </Field>
          <Field label={t("Jour d'envoi")} htmlFor="sendDayOfWeek">
            <Select id="sendDayOfWeek" name="sendDayOfWeek" defaultValue={config.sendDayOfWeek}>
              {DAYS.map((day) => (
                <option key={day.value} value={day.value}>{t(day.label)}</option>
              ))}
            </Select>
          </Field>
          <Field label={t("Heure d'envoi")} htmlFor="sendTime">
            <Input id="sendTime" name="sendTime" type="time" defaultValue={config.sendTime} required />
          </Field>
          <Field label={t("Fuseau horaire")} htmlFor="timezone">
            <Input id="timezone" name="timezone" defaultValue={config.timezone} required />
          </Field>
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
