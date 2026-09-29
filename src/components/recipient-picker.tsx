"use client";

import { useState } from "react";
import { useTranslations } from "@/components/locale-provider";
import { Button } from "@/components/ui";

export type RecipientOption = { id: string; name: string; email: string };

export function RecipientPickerModal({
  title,
  description,
  recipients,
  pending = false,
  onCancel,
  onConfirm,
}: {
  title: string;
  description?: string;
  recipients: RecipientOption[];
  pending?: boolean;
  onCancel: () => void;
  onConfirm: (selected: string[]) => void;
}) {
  const t = useTranslations();
  const [selected, setSelected] = useState<string[]>(() => recipients.map((item) => item.email));
  const allSelected = recipients.length > 0 && selected.length === recipients.length;

  function toggle(email: string) {
    setSelected((prev) =>
      prev.includes(email) ? prev.filter((value) => value !== email) : [...prev, email],
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onCancel}
    >
      <div
        className="flex w-full max-w-lg flex-col rounded-lg border border-slate-200 bg-white shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-700"
            aria-label={t("Fermer")}
          >
            &times;
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-5">
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={allSelected}
              onChange={(event) =>
                setSelected(event.target.checked ? recipients.map((item) => item.email) : [])
              }
            />
            {t("Tous")}
            <span className="ml-auto text-xs text-slate-500">{recipients.length}</span>
          </label>

          <div className="mt-3 flex flex-col gap-1">
            {recipients.map((item) => (
              <label
                key={item.email}
                className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={selected.includes(item.email)}
                  onChange={() => toggle(item.email)}
                />
                <span className="truncate font-medium text-slate-800">{item.name}</span>
                <span className="truncate text-xs text-slate-400">{item.email}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-5">
          <span className="text-sm text-slate-500">
            {t("{count} destinataire(s) selectionne(s).", { count: selected.length })}
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>
              {t("Annuler")}
            </Button>
            <Button
              type="button"
              onClick={() => onConfirm(selected)}
              disabled={pending || selected.length === 0}
            >
              {pending ? t("Envoi...") : t("Envoyer")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
