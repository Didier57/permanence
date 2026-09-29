import { cookies } from "next/headers";
import { getCurrentAccount } from "@/lib/auth";
import { LOCALE_COOKIE, resolveLocale, type Locale } from "@/lib/i18n";

export async function getPublicLocale(): Promise<Locale> {
  const store = await cookies();
  return resolveLocale(store.get(LOCALE_COOKIE)?.value);
}

export async function getCurrentLocale(): Promise<Locale> {
  const account = await getCurrentAccount();
  if (account) return resolveLocale(account.locale);
  return getPublicLocale();
}
