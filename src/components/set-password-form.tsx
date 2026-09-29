"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { useTranslations } from "@/components/locale-provider";
import {
  activateAccountAction,
  resetPasswordAction,
  type PasswordState,
} from "@/server/password-actions";

const initialState: PasswordState = {};

export function SetPasswordForm({
  kind,
  token,
}: {
  kind: "ACTIVATION" | "RESET";
  token: string;
}) {
  const action = kind === "ACTIVATION" ? activateAccountAction : resetPasswordAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const t = useTranslations();

  if (!token) {
    return (
      <div className="flex flex-col gap-3">
        <Alert tone="error">{t("Lien incomplet ou invalide.")}</Alert>
        <Link
          href="/mot-de-passe-oublie"
          className="text-center text-sm font-medium text-sky-600 hover:underline"
        >
          {t("Demander un nouveau lien")}
        </Link>
      </div>
    );
  }

  if (state.ok) {
    return (
      <div className="flex flex-col gap-3">
        <Alert tone="success">{t(state.message ?? "")}</Alert>
        <Link
          href="/login"
          className="rounded-md bg-sky-600 px-4 py-2 text-center text-sm font-semibold text-on-brand shadow-sm transition hover:bg-sky-700"
        >
          {t("Se connecter")}
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      <input type="hidden" name="token" value={token} />

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

      <Button type="submit" disabled={pending} className="px-4 py-2">
        {pending ? t("Enregistrement...") : t("Enregistrer le mot de passe")}
      </Button>
    </form>
  );
}
