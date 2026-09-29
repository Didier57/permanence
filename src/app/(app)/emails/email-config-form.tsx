"use client";

import { useActionState } from "react";
import { RichTextEditor } from "@/components/rich-text-editor";
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

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} className="flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Serveur SMTP" htmlFor="smtpHost">
            <Input id="smtpHost" name="smtpHost" defaultValue={config.smtpHost} required />
          </Field>
          <Field label="Port" htmlFor="smtpPort">
            <Input id="smtpPort" name="smtpPort" type="number" defaultValue={config.smtpPort} required />
          </Field>
          <Field label="Chiffrement" htmlFor="smtpEncryption">
            <Select id="smtpEncryption" name="smtpEncryption" defaultValue={config.smtpEncryption}>
              <option value="STARTTLS">STARTTLS</option>
              <option value="SSL">SSL / TLS</option>
              <option value="NONE">Aucun</option>
            </Select>
          </Field>
          <Field label="Utilisateur SMTP" htmlFor="smtpUser">
            <Input id="smtpUser" name="smtpUser" defaultValue={config.smtpUser ?? ""} autoComplete="off" />
          </Field>
          <Field
            label="Mot de passe SMTP"
            htmlFor="smtpPassword"
            hint={config.hasPassword ? "Un mot de passe est enregistre. Laisser vide pour le conserver." : "Aucun mot de passe enregistre."}
          >
            <Input id="smtpPassword" name="smtpPassword" type="password" autoComplete="new-password" placeholder={config.hasPassword ? "********" : ""} />
          </Field>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" name="clearPassword" className="h-4 w-4" />
              Supprimer le mot de passe enregistre
            </label>
          </div>
          <Field label="Adresse d'expedition" htmlFor="fromAddress">
            <Input id="fromAddress" name="fromAddress" type="email" defaultValue={config.fromAddress} required />
          </Field>
          <Field label="Nom d'expedition" htmlFor="fromName">
            <Input id="fromName" name="fromName" defaultValue={config.fromName ?? ""} />
          </Field>
          <Field label="Adresse de reponse (reply-to)" htmlFor="replyTo" hint="Optionnel">
            <Input id="replyTo" name="replyTo" type="email" defaultValue={config.replyTo ?? ""} />
          </Field>
          <Field label="Copie (CC)" htmlFor="ccRecipients" hint="Adresses separees par des virgules.">
            <Input id="ccRecipients" name="ccRecipients" defaultValue={config.ccRecipients.join(", ")} />
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Field label="Envoi automatique" htmlFor="enabled">
            <label className="flex h-[38px] items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" id="enabled" name="enabled" defaultChecked={config.enabled} className="h-4 w-4" />
              Active
            </label>
          </Field>
          <Field label="Jour d'envoi" htmlFor="sendDayOfWeek">
            <Select id="sendDayOfWeek" name="sendDayOfWeek" defaultValue={config.sendDayOfWeek}>
              {DAYS.map((day) => (
                <option key={day.value} value={day.value}>{day.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Heure d'envoi" htmlFor="sendTime">
            <Input id="sendTime" name="sendTime" type="time" defaultValue={config.sendTime} required />
          </Field>
          <Field label="Fuseau horaire" htmlFor="timezone">
            <Input id="timezone" name="timezone" defaultValue={config.timezone} required />
          </Field>
        </div>

        <div className="flex flex-col gap-4 border-t border-slate-200 pt-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Modele du message</h3>
            <p className="text-xs text-slate-500">
              Ces textes sont inseres dans l&apos;email, au-dessus puis en dessous du planning. Laissez vide
              pour ne rien ajouter. Collez du texte brut : la mise en forme se fait avec la barre d&apos;outils.
            </p>
          </div>
          <Field
            label="Texte au-dessus du planning"
            hint="Insere juste apres le numero de semaine et les dates, avant la liste des groupes."
          >
            <RichTextEditor
              name="introHtml"
              defaultValue={config.introHtml}
              placeholder="Ex. Merci de prevenir en cas d'empechement."
            />
          </Field>
          <Field
            label="Texte en dessous du planning"
            hint="Insere apres la liste des groupes, en fin d'email."
          >
            <RichTextEditor
              name="outroHtml"
              defaultValue={config.outroHtml}
              placeholder="Ex. Contact : responsable@exemple.fr"
            />
          </Field>
        </div>

        {state.error ? <Alert tone="error">{state.error}</Alert> : null}
        {state.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}

        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Enregistrement..." : "Enregistrer la configuration"}
          </Button>
        </div>
      </form>

      <form action={testAction} className="flex flex-col gap-3 border-t border-slate-200 pt-4">
        <div className="grid items-end gap-4 md:grid-cols-[1fr_auto]">
          <Field label="Destinataire du test" htmlFor="testRecipient" hint={`Par defaut : ${accountEmail}`}>
            <Input id="testRecipient" name="testRecipient" type="email" placeholder={accountEmail} />
          </Field>
          <Button type="submit" variant="secondary" disabled={testPending}>
            {testPending ? "Test en cours..." : "Tester la configuration SMTP"}
          </Button>
        </div>
        {testState.error ? <Alert tone="error">{testState.error}</Alert> : null}
        {testState.ok && testState.message ? <Alert tone="success">{testState.message}</Alert> : null}
      </form>
    </div>
  );
}
