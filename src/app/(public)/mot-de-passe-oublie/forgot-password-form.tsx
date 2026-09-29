"use client";

import { useActionState } from "react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { useTranslations } from "@/components/locale-provider";
import { requestPasswordResetAction, type PasswordState } from "@/server/password-actions";

const initialState: PasswordState = {};

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, initialState);
  const t = useTranslations();

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      <Field
        label={t("Adresse email")}
        htmlFor="email"
        hint={t("L'adresse associee a votre compte.")}
      >
        <Input id="email" name="email" type="email" autoComplete="email" autoFocus required />
      </Field>

      {state.error ? <Alert tone="error">{t(state.error)}</Alert> : null}
      {state.ok && state.message ? <Alert tone="success">{t(state.message)}</Alert> : null}

      <Button type="submit" disabled={pending} className="px-4 py-2">
        {pending ? t("Envoi...") : t("Envoyer le lien de reinitialisation")}
      </Button>
    </form>
  );
}
