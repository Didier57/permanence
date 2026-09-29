"use client";

import { useActionState } from "react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { sendWeekEmailForDate, type EmailActionState } from "@/server/email-actions";

const INITIAL: EmailActionState = {};

export function ManualSendForm({ defaultDate }: { defaultDate: string }) {
  const [state, formAction, pending] = useActionState(sendWeekEmailForDate, INITIAL);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid items-end gap-4 md:grid-cols-[1fr_auto]">
        <Field
          label="Envoyer le planning d'une semaine"
          htmlFor="date"
          hint="Choisir une date appartenant a la semaine a envoyer."
        >
          <Input id="date" name="date" type="date" defaultValue={defaultDate} required />
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? "Envoi..." : "Envoyer maintenant"}
        </Button>
      </div>
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
    </form>
  );
}
