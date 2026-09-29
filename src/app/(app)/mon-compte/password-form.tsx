"use client";

import { useActionState } from "react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { useTranslations } from "@/components/locale-provider";
import { changeOwnPasswordAction, type PasswordState } from "@/server/password-actions";

const initialState: PasswordState = {};

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(changeOwnPasswordAction, initialState);
  const t = useTranslations();

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <Field label={t("Mot de passe actuel")} htmlFor="currentPassword">
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      <Field
        label={t("Nouveau mot de passe")}
        htmlFor="password"
        hint={t("8 caracteres minimum.")}
      >
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </Field>

      <Field label={t("Confirmation")} htmlFor="confirmPassword">
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
      </Field>

      {state.error ? <Alert tone="error">{t(state.error)}</Alert> : null}
      {state.ok && state.message ? <Alert tone="success">{t(state.message)}</Alert> : null}

      <Button type="submit" disabled={pending}>
        {pending ? t("Enregistrement...") : t("Modifier le mot de passe")}
      </Button>
    </form>
  );
}
