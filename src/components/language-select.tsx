"use client";

import { useActionState } from "react";
import { Label, Select } from "@/components/ui";
import { useLocale, useTranslations } from "@/components/locale-provider";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n";
import {
  setLocaleAction,
  setPublicLocaleAction,
  type LocaleActionState,
} from "@/server/locale-actions";

export function LanguageSelect({
  scope = "account",
  id = "locale",
}: {
  scope?: "account" | "public";
  id?: string;
}) {
  const locale = useLocale();
  const t = useTranslations();
  const action = scope === "public" ? setPublicLocaleAction : setLocaleAction;
  const [state, formAction] = useActionState<LocaleActionState, FormData>(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{t("Langue")}</Label>
      <Select
        id={id}
        name="locale"
        defaultValue={locale}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        {LOCALES.map((item) => (
          <option key={item} value={item}>
            {LOCALE_LABELS[item]}
          </option>
        ))}
      </Select>
      <button type="submit" className="sr-only">
        {t("Appliquer")}
      </button>
      {state.error ? <p className="text-xs text-red-600 dark:text-red-300">{t(state.error)}</p> : null}
      {state.ok && state.message ? (
        <p className="text-xs text-emerald-600 dark:text-emerald-300">{t(state.message)}</p>
      ) : null}
    </form>
  );
}
