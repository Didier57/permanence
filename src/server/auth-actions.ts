"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, destroySession, invalidateAccountTokens } from "@/lib/auth";
import { verifyPassword } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const loginSchema = z.object({
  identifier: z.string().trim().min(1),
  password: z.string().min(1),
});

export type LoginState = { error?: string };

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Identifiant et mot de passe requis." };
  }

  const email = parsed.data.identifier.toLowerCase();
  const account = await prisma.account.findUnique({ where: { email } });

  if (!account || !account.active) {
    logger.warn({ email }, "login.failed");
    return { error: "Identifiants invalides." };
  }

  if (!account.activatedAt) {
    logger.warn({ email }, "login.not-activated");
    return {
      error:
        "Ce compte n'est pas encore active. Utilisez le lien d'activation recu par email ou demandez un nouveau lien.",
    };
  }

  const passwordOk = await verifyPassword(account.passwordHash, parsed.data.password);
  if (!passwordOk) {
    logger.warn({ email }, "login.failed");
    return { error: "Identifiants invalides." };
  }

  const invalidated = await invalidateAccountTokens(account.id);
  if (invalidated > 0) {
    logger.info({ email, count: invalidated }, "login.invalidated-tokens");
  }

  const headerList = await headers();
  await createSession(account.id, {
    userAgent: headerList.get("user-agent"),
    ip: headerList.get("x-forwarded-for"),
  });
  await prisma.account.update({
    where: { id: account.id },
    data: { lastLoginAt: new Date() },
  });

  logger.info({ email, role: account.role }, "login.success");
  redirect("/planning");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
