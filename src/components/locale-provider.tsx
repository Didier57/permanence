"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  DEFAULT_LOCALE,
  createTranslator,
  type Locale,
  type Translator,
  type TranslationVars,
} from "@/lib/i18n";

type LocaleContextValue = { locale: Locale; t: Translator };

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  t: createTranslator(DEFAULT_LOCALE),
});

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo<LocaleContextValue>(
    () => ({ locale, t: createTranslator(locale) }),
    [locale],
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext).locale;
}

export function useTranslations(): Translator {
  return useContext(LocaleContext).t;
}

export function T({ msg, vars }: { msg: string; vars?: TranslationVars }) {
  const t = useTranslations();
  return <>{t(msg, vars)}</>;
}
