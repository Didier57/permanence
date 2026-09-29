"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "@/components/locale-provider";
import { RecipientPickerModal, type RecipientOption } from "@/components/recipient-picker";
import { Alert, Button, Field, Input } from "@/components/ui";
import { fromDateInput, getISOWeekInfo } from "@/lib/date";
import { previewWeekRecipients, sendWeekEmailForDate } from "@/server/email-actions";

export function ManualSendForm({ defaultDate }: { defaultDate: string }) {
  const t = useTranslations();
  const [date, setDate] = useState(defaultDate);
  const [recipients, setRecipients] = useState<RecipientOption[] | null>(null);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function requestRecipients() {
    setMessage(null);
    const { weekYear, weekNumber } = getISOWeekInfo(fromDateInput(date));
    startTransition(async () => {
      const result = await previewWeekRecipients({ weekYear, weekNumber });
      if (!result.ok || !result.recipients) {
        setMessage({ tone: "error", text: t(result.error ?? "Erreur.") });
        return;
      }
      setRecipients(result.recipients);
    });
  }

  function confirmSend(selected: string[]) {
    const toEveryone = recipients !== null && selected.length === recipients.length;
    startTransition(async () => {
      const result = await sendWeekEmailForDate({
        date,
        recipients: toEveryone ? null : selected,
      });
      setRecipients(null);
      if (!result.ok) {
        setMessage({ tone: "error", text: t(result.error ?? "Erreur lors de l'envoi.") });
        return;
      }
      setMessage({
        tone: "success",
        text: result.partial
          ? t(
              "Envoi partiel : {count} destinataire(s). L'envoi automatique programme partira dans tous les cas.",
              { count: result.recipientCount ?? selected.length },
            )
          : t("Planning envoye a {count} destinataire(s).", {
              count: result.recipientCount ?? selected.length,
            }),
      });
    });
  }

  return (
    <>
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          requestRecipients();
        }}
      >
        <div className="grid items-end gap-4 md:grid-cols-[1fr_auto]">
          <Field
            label={t("Envoyer le planning d'une semaine")}
            htmlFor="date"
            hint={t("Choisir une date appartenant a la semaine a envoyer.")}
          >
            <Input
              id="date"
              name="date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </Field>
          <Button type="submit" disabled={pending}>
            {pending && recipients === null ? t("Envoi...") : t("Envoyer maintenant")}
          </Button>
        </div>
        {message?.tone === "error" ? <Alert tone="error">{message.text}</Alert> : null}
        {message?.tone === "success" ? <Alert tone="success">{message.text}</Alert> : null}
      </form>

      {recipients ? (
        <RecipientPickerModal
          title={t("Choisir les destinataires")}
          description={t(
            "L'envoi automatique programme partira dans tous les cas pour toute la semaine.",
          )}
          recipients={recipients}
          pending={pending}
          onCancel={() => setRecipients(null)}
          onConfirm={confirmSend}
        />
      ) : null}
    </>
  );
}
