"use client";

import { useActionState } from "react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { changeOwnPasswordAction, type PasswordState } from "@/server/password-actions";

const initialState: PasswordState = {};

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(changeOwnPasswordAction, initialState);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <Field label="Mot de passe actuel" htmlFor="currentPassword">
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      <Field label="Nouveau mot de passe" htmlFor="password" hint="8 caracteres minimum.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </Field>

      <Field label="Confirmation" htmlFor="confirmPassword">
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
      </Field>

      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.ok ? <Alert tone="success">{state.message}</Alert> : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement..." : "Modifier le mot de passe"}
      </Button>
    </form>
  );
}
