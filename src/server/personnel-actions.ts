"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export type ActionState = { ok?: boolean; error?: string; message?: string };

const optionalPhone = z
  .string()
  .trim()
  .max(30)
  .optional()
  .or(z.literal(""));

const userSchema = z.object({
  firstName: z.string().trim().min(1, "Le prenom est requis").max(100),
  lastName: z.string().trim().min(1, "Le nom est requis").max(100),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  proPhone: optionalPhone,
  privatePhone: optionalPhone,
  active: z.boolean(),
});

export async function saveUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Acces refuse." };
  }

  const parsed = userSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    proPhone: formData.get("proPhone") ?? undefined,
    privatePhone: formData.get("privatePhone") ?? undefined,
    active: formData.get("active") === "on" || formData.get("active") === "true",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Donnees invalides." };
  }

  const id = formData.get("id")?.toString() || null;
  const groupIds = formData
    .getAll("groupIds")
    .map((value) => String(value))
    .filter(Boolean);

  const { firstName, lastName, email } = parsed.data;
  const proPhone = parsed.data.proPhone?.trim() ? parsed.data.proPhone.trim() : null;
  const privatePhone = parsed.data.privatePhone?.trim() ? parsed.data.privatePhone.trim() : null;

  const duplicate = await prisma.user.findFirst({
    where: { email, ...(id ? { NOT: { id } } : {}) },
  });
  if (duplicate) {
    return { error: "Cet email est deja utilise par une autre personne." };
  }

  if (id) {
    await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: { firstName, lastName, email, proPhone, privatePhone, active: parsed.data.active },
      }),
      prisma.userGroup.deleteMany({ where: { userId: id } }),
      prisma.userGroup.createMany({
        data: groupIds.map((groupId) => ({ userId: id, groupId })),
        skipDuplicates: true,
      }),
    ]);
  } else {
    await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        proPhone,
        privatePhone,
        active: parsed.data.active,
        memberships: { create: groupIds.map((groupId) => ({ groupId })) },
      },
    });
  }

  logger.info({ email }, "user.saved");
  revalidatePath("/personnel");
  revalidatePath("/planning");
  return { ok: true, message: "Personne enregistree." };
}

export async function deleteUser(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = formData.get("id")?.toString();
  if (!id) return;
  const permanenceCount = await prisma.permanence.count({ where: { userId: id } });
  if (permanenceCount > 0) {
    await prisma.user.update({ where: { id }, data: { active: false } });
    logger.info({ id }, "user.deactivated");
  } else {
    await prisma.user.delete({ where: { id } });
    logger.info({ id }, "user.deleted");
  }
  revalidatePath("/personnel");
  revalidatePath("/planning");
}
