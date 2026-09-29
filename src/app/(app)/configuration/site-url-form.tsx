"use client";

import { useActionState } from "react";
import { Alert, Button, Field, Input } from "@/components/ui";
import {
  saveAppConfiguration,
  type AppConfigurationActionState,
} from "@/server/configuration-actions";

const INITIAL: AppConfigurationActionState = {};

export function SiteUrlForm({
  configuredUrl,
  effectiveUrl,
}: {
  configuredUrl: string;
  effectiveUrl: string;
}) {
  const [state, formAction, pending] = useActionState(saveAppConfiguration, INITIAL);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field
        label="Adresse du site"
        htmlFor="appUrl"
        hint="Utilisee pour construire les liens envoyes par email (activation, reinitialisation). Laissez vide pour utiliser la valeur par defaut."
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

      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement..." : "Enregistrer l'adresse"}
        </Button>
        <p className="text-xs text-slate-500">
          Adresse actuellement utilisee : <span className="font-medium">{effectiveUrl}</span>
        </p>
      </div>
    </form>
  );
}
