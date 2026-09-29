"use server";

import { z } from "zod";
import {
  consumeAccountToken,
  createAccountToken,
  findValidAccountToken,
  requireAccount,
  setAccountPassword,
} from "@/lib/auth";
import { verifyPassword } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { buildAccountLinkUrl, sendAccountEmail } from "./services/email";

export type PasswordState = { ok?: boolean; error?: string; message?: string };

const emailField = z.string().trim().toLowerCase().pipe(z.email());

const passwordFields = z
  .object({
    password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caracteres.").max(200),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les deux mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  });

export async function activateAccountAction(
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const token = formData.get("token")?.toString() ?? "";
  const parsed = passwordFields.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Donnees invalides." };
  }

  const record = await findValidAccountToken(token, "ACTIVATION");
  if (!record) {
    return { error: "Lien d'activation invalide ou expire. Demandez un nouveau lien." };
  }
  if (!record.account.active) {
    return { error: "Ce compte est desactive. Contactez un administrateur." };
  }

  await consumeAccountToken(record.id);
  await setAccountPassword(record.accountId, parsed.data.password);
  logger.info({ accountId: record.accountId }, "account.activated");
  return { ok: true, message: "Votre compte est active. Vous pouvez maintenant vous connecter." };
}

export async function resetPasswordAction(
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const token = formData.get("token")?.toString() ?? "";
  const parsed = passwordFields.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Donnees invalides." };
  }

  const record = await findValidAccountToken(token, "RESET");
  if (!record) {
    return { error: "Lien de reinitialisation invalide ou expire. Demandez un nouveau lien." };
  }
  if (!record.account.active) {
    return { error: "Ce compte est desactive. Contactez un administrateur." };
  }

  await consumeAccountToken(record.id);
  await setAccountPassword(record.accountId, parsed.data.password);
  logger.info({ accountId: record.accountId }, "account.password.reset");
  return { ok: true, message: "Votre mot de passe a ete modifie. Vous pouvez vous connecter." };
}

export async function requestPasswordResetAction(
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const parsed = emailField.safeParse(formData.get("email"));
  const generic: PasswordState = {
    ok: true,
    message:
      "Si un compte correspond a cette adresse, un email de reinitialisation vient d'etre envoye.",
  };
  if (!parsed.success) {
    return { error: "Adresse email invalide." };
  }

  const account = await prisma.account.findUnique({ where: { email: parsed.data } });
  if (!account || !account.active) {
    logger.info({ email: parsed.data }, "account.reset.requested.unknown");
    return generic;
  }

  const { token, expiresAt } = await createAccountToken(account.id, "RESET");
  const url = buildAccountLinkUrl(token, "RESET");
  const result = await sendAccountEmail({
    to: account.email,
    kind: "RESET",
    name: account.displayName,
    url,
    expiresAt,
  });

  if (!result.ok) {
    logger.error({ accountId: account.id }, "account.reset.email.failed");
    return {
      ok: false,
      error:
        "L'envoi de l'email a echoue (configuration SMTP). Contactez un administrateur pour reinitialiser votre mot de passe.",
    };
  }

  logger.info({ accountId: account.id }, "account.reset.email.sent");
  return generic;
}

export async function changeOwnPasswordAction(
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  let account;
  try {
    account = await requireAccount();
  } catch {
    return { error: "Session expiree. Reconnectez-vous." };
  }

  const currentPassword = formData.get("currentPassword")?.toString() ?? "";
  const parsed = passwordFields.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Donnees invalides." };
  }

  const record = await prisma.account.findUnique({ where: { id: account.id } });
  if (!record) return { error: "Compte introuvable." };

  const currentOk = await verifyPassword(record.passwordHash, currentPassword);
  if (!currentOk) {
    logger.warn({ accountId: account.id }, "account.password.change.refused");
    return { error: "Mot de passe actuel incorrect." };
  }

  await setAccountPassword(record.id, parsed.data.password);
  logger.info({ accountId: record.id }, "account.password.changed");

  const { createSession } = await import("@/lib/auth");
  const { headers } = await import("next/headers");
  const headerList = await headers();
  await createSession(record.id, {
    userAgent: headerList.get("user-agent"),
    ip: headerList.get("x-forwarded-for"),
  });

  return { ok: true, message: "Votre mot de passe a ete modifie." };
}
