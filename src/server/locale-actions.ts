"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { requireAccount } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LOCALE_COOKIE, LOCALES } from "@/lib/i18n";
import { logger } from "@/lib/logger";

export type LocaleActionState = { ok?: boolean; error?: string; message?: string };

const localeSchema = z.object({ locale: z.enum(LOCALES) });

function setLocaleCookie(store: Awaited<ReturnType<typeof cookies>>, locale: string) {
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}

export async function setLocaleAction(
  _prev: LocaleActionState,
  formData: FormData,
): Promise<LocaleActionState> {
  let account;
  try {
    account = await requireAccount();
  } catch {
    return { error: "Acces refuse." };
  }

  const parsed = localeSchema.safeParse({ locale: formData.get("locale") });
  if (!parsed.success) return { error: "Langue inconnue." };
  const { locale } = parsed.data;

  await prisma.account.update({ where: { id: account.id }, data: { locale } });
  if (account.userId) {
    await prisma.user
      .update({ where: { id: account.userId }, data: { locale } })
      .catch(() => undefined);
  }

  const store = await cookies();
  setLocaleCookie(store, locale);
  logger.info({ accountId: account.id, locale }, "locale.changed");
  revalidatePath("/", "layout");
  return { ok: true, message: "Langue enregistree." };
}

export async function setPublicLocaleAction(
  _prev: LocaleActionState,
  formData: FormData,
): Promise<LocaleActionState> {
  const parsed = localeSchema.safeParse({ locale: formData.get("locale") });
  if (!parsed.success) return { error: "Langue inconnue." };
  const store = await cookies();
  setLocaleCookie(store, parsed.data.locale);
  revalidatePath("/", "layout");
  return { ok: true, message: "Langue enregistree." };
}
