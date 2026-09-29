"use client";

import { useActionState } from "react";
import { GlobeIcon } from "@/components/icons";
import { useLocale, useTranslations } from "@/components/locale-provider";
import { LOCALE_LABELS } from "@/lib/i18n";
import { setLocaleAction, type LocaleActionState } from "@/server/locale-actions";

const initialState: LocaleActionState = {};

export function LanguageToggle() {
  const locale = useLocale();
  const t = useTranslations();
  const [state, formAction] = useActionState(setLocaleAction, initialState);
  const nextLocale = locale === "fr" ? "en" : "fr";

  return (
    <form action={formAction}>
      <input type="hidden" name="locale" value={nextLocale} />
      <button
        type="submit"
        title={t("Changer de langue")}
        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-100 sidebar-collapsed:justify-center sidebar-collapsed:px-2"
      >
        <GlobeIcon className="h-5 w-5 shrink-0" />
        <span className="truncate sidebar-collapsed:hidden">{LOCALE_LABELS[nextLocale]}</span>
      </button>
      {state.error ? (
        <span className="block px-3 text-xs text-red-600 sidebar-collapsed:hidden">
          {t(state.error)}
        </span>
      ) : null}
    </form>
  );
}
