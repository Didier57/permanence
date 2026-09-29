"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export type ActionState = { ok?: boolean; error?: string; message?: string };

const groupSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis").max(100),
  description: z.string().trim().max(500).optional(),
  color: z
    .string()
    .trim()
    .regex(/^#?[0-9a-fA-F]{6}$/, "Couleur invalide")
    .optional()
    .or(z.literal("")),
});

export async function saveGroup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Acces refuse." };
  }

  const parsed = groupSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? undefined,
    color: formData.get("color") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Donnees invalides." };
  }

  const id = formData.get("id")?.toString() || null;
  const name = parsed.data.name;
  const description = parsed.data.description?.trim() ? parsed.data.description.trim() : null;
  const colorRaw = parsed.data.color?.trim();
  const color = colorRaw ? (colorRaw.startsWith("#") ? colorRaw : `#${colorRaw}`) : null;
  const memberIds = formData
    .getAll("memberIds")
    .map((value) => String(value))
    .filter(Boolean);

  const duplicate = await prisma.group.findFirst({
    where: { name, ...(id ? { NOT: { id } } : {}) },
  });
  if (duplicate) {
    return { error: "Un groupe porte deja ce nom." };
  }

  if (id) {
    await prisma.$transaction([
      prisma.group.update({ where: { id }, data: { name, description, color } }),
      prisma.userGroup.deleteMany({ where: { groupId: id } }),
      prisma.userGroup.createMany({
        data: memberIds.map((userId) => ({ userId, groupId: id })),
        skipDuplicates: true,
      }),
    ]);
  } else {
    await prisma.group.create({
      data: {
        name,
        description,
        color,
        members: { create: memberIds.map((userId) => ({ userId })) },
      },
    });
  }

  logger.info({ name, memberCount: memberIds.length }, "group.saved");
  revalidatePath("/groupes");
  revalidatePath("/personnel");
  return { ok: true, message: "Groupe enregistre." };
}

export async function deleteGroup(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = formData.get("id")?.toString();
  if (!id) return;
  const permanenceCount = await prisma.permanence.count({ where: { groupId: id } });
  if (permanenceCount > 0) {
    logger.warn({ id }, "group.delete.refused");
    return;
  }
  await prisma.group.delete({ where: { id } });
  logger.info({ id }, "group.deleted");
  revalidatePath("/groupes");
  revalidatePath("/personnel");
}
