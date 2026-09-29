"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { hashPassword } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export type AccountActionState = { ok?: boolean; error?: string; message?: string };

const schema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Adresse email invalide")),
  displayName: z.string().trim().max(150).optional(),
  role: z.enum(["ADMIN", "MANAGER", "USER"]),
  active: z.boolean(),
});

export async function saveAccount(
  _prev: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Acces refuse." };
  }

  const parsed = schema.safeParse({
    email: formData.get("email"),
    displayName: formData.get("displayName") ?? undefined,
    role: formData.get("role") ?? "USER",
    active: formData.get("active") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Donnees invalides." };
  }

  const id = formData.get("id")?.toString() || null;
  const password = formData.get("password")?.toString() ?? "";
  const userIdRaw = formData.get("userId")?.toString() ?? "";
  const userId = userIdRaw && userIdRaw !== "" ? userIdRaw : null;

  if (!id && password.trim().length < 8) {
    return { error: "Le mot de passe doit contenir au moins 8 caracteres." };
  }
  if (password.trim().length > 0 && password.trim().length < 8) {
    return { error: "Le mot de passe doit contenir au moins 8 caracteres." };
  }

  const duplicate = await prisma.account.findFirst({
    where: { email: parsed.data.email, ...(id ? { NOT: { id } } : {}) },
  });
  if (duplicate) {
    return { error: "Un compte utilise deja cette adresse." };
  }

  if (userId) {
    const linked = await prisma.account.findFirst({
      where: { userId, ...(id ? { NOT: { id } } : {}) },
    });
    if (linked) {
      return { error: "Cette personne est deja liee a un autre compte." };
    }
  }

  const data = {
    email: parsed.data.email,
    displayName: parsed.data.displayName?.trim() ? parsed.data.displayName.trim() : null,
    role: parsed.data.role,
    active: parsed.data.active,
    userId,
  };

  try {
    if (id) {
      await prisma.account.update({
        where: { id },
        data: {
          ...data,
          ...(password.trim().length > 0 ? { passwordHash: await hashPassword(password.trim()) } : {}),
        },
    });
    } else {
      await prisma.account.create({
        data: { ...data, passwordHash: await hashPassword(password.trim()) },
      });
    }
  } catch (error) {
    logger.error({ err: error }, "account.save.error");
    return { error: "Erreur lors de l'enregistrement du compte." };
  }

  logger.info({ email: data.email, role: data.role }, "account.saved");
  revalidatePath("/configuration");
  return { ok: true, message: "Compte enregistre." };
}

export async function deleteAccount(formData: FormData): Promise<void> {
  const current = await requireAdmin();
  const id = formData.get("id")?.toString();
  if (!id || id === current.id) return;

  const target = await prisma.account.findUnique({ where: { id } });
  if (!target) return;

  if (target.role === "ADMIN") {
    const adminCount = await prisma.account.count({ where: { role: "ADMIN", active: true } });
    if (adminCount <= 1) {
      logger.warn({ id }, "account.delete.refused.lastAdmin");
      return;
    }
  }

  await prisma.account.delete({ where: { id } });
  logger.info({ id }, "account.deleted");
  revalidatePath("/configuration");
}
