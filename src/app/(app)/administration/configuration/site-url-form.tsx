"use client";

import { useActionState } from "react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { useTranslations } from "@/components/locale-provider";
import {
  saveAppConfiguration,
  type AppConfigurationActionState,
} from "@/server/configuration-actions";

const INITIAL: AppConfigurationActionState = {};

export function SiteUrlForm({
  configuredUrl,
  effectiveUrl,
  callCenterEmail,
  timezone,
}: {
  configuredUrl: string;
  effectiveUrl: string;
  callCenterEmail: string;
  timezone: string;
}) {
  const [state, formAction, pending] = useActionState(saveAppConfiguration, INITIAL);
  const t = useTranslations();

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field
        label={t("Adresse du site")}
        htmlFor="appUrl"
        hint={t("Utilisee pour construire les liens envoyes par email (activation, reinitialisation). Laissez vide pour utiliser la valeur par defaut.")}
      >
        <Input
          id="appUrl"
          name="appUrl"
          type="url"
          defaultValue={configuredUrl}
          placeholder={effectiveUrl}
          autoComplete="off"
        />
      </Field>

      <Field
        label={t("Email CallCenter")}
        htmlFor="callCenterEmail"
        hint={t("Cette adresse recoit automatiquement le lien du planning pour chaque creneau CallCenter.")}
      >
        <Input
          id="callCenterEmail"
          name="callCenterEmail"
          type="email"
          defaultValue={callCenterEmail}
          autoComplete="off"
        />
      </Field>

      <Field
        label={t("Fuseau horaire")}
        htmlFor="timezone"
        hint={t("Fuseau utilise pour les envois automatiques et les liens du planning.")}
      >
        <Input id="timezone" name="timezone" defaultValue={timezone} required />
      </Field>

      {state.error ? <Alert tone="error">{t(state.error)}</Alert> : null}
      {state.ok && state.message ? <Alert tone="success">{t(state.message)}</Alert> : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? t("Enregistrement...") : t("Enregistrer l'adresse")}
        </Button>
        <p className="text-xs text-slate-500">
          {t("Adresse actuellement utilisee :")} <span className="font-medium">{effectiveUrl}</span>
        </p>
      </div>
    </form>
  );
}
