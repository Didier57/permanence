"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireManager } from "@/lib/auth";
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
    await requireManager();
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
    const last = await prisma.group.findFirst({
      orderBy: [{ position: "desc" }, { name: "desc" }],
      select: { position: true },
    });
    await prisma.group.create({
      data: {
        name,
        description,
        color,
        position: (last?.position ?? -1) + 1,
        members: { create: memberIds.map((userId) => ({ userId })) },
      },
    });
  }

  logger.info({ name, memberCount: memberIds.length }, "group.saved");
  revalidatePath("/groupes");
  revalidatePath("/personnel");
  revalidatePath("/planning");
  return { ok: true, message: "Groupe enregistre." };
}

export async function moveGroup(formData: FormData): Promise<void> {
  await requireManager();
  const id = formData.get("id")?.toString();
  const direction = formData.get("direction")?.toString();
  if (!id || (direction !== "up" && direction !== "down")) return;

  const groups = await prisma.group.findMany({
    orderBy: [{ position: "asc" }, { name: "asc" }],
    select: { id: true },
  });
  const index = groups.findIndex((group) => group.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= groups.length) return;

  const ordered = [...groups];
  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
  await prisma.$transaction(
    ordered.map((group, position) =>
      prisma.group.update({ where: { id: group.id }, data: { position } }),
    ),
  );

  logger.info({ id, direction }, "group.moved");
  revalidatePath("/groupes");
  revalidatePath("/personnel");
  revalidatePath("/planning");
}

export async function deleteGroup(formData: FormData): Promise<void> {
  await requireManager();
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
  revalidatePath("/planning");
}
