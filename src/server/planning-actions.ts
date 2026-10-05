"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireManager } from "@/lib/auth";
import { fromDateInput, getISOWeekInfo, isoWeekRange, weekDays } from "@/lib/date";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { hasPendingResend } from "./services/planning";

export type PlanningActionResult = {
  ok: boolean;
  error?: string;
  replaced?: boolean;
  unchanged?: boolean;
  removed?: boolean;
  needsResend?: boolean;
  weekYear?: number;
  weekNumber?: number;
};

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide");

const assignSchema = z.object({
  date: dateString,
  groupId: z.string().min(1),
  userId: z.string().min(1),
});

const removeSchema = z.object({
  date: dateString,
  groupId: z.string().min(1),
});

const fillSchema = z.object({
  weekYear: z.number().int(),
  weekNumber: z.number().int().min(1).max(53),
  groupId: z.string().min(1),
  userId: z.string().min(1),
});

const removeWeekSchema = z.object({
  weekYear: z.number().int(),
  weekNumber: z.number().int().min(1).max(53),
  groupId: z.string().min(1),
});

async function guard(): Promise<{ id: string } | null> {
  try {
    const account = await requireManager();
    return { id: account.id };
  } catch {
    return null;
  }
}

async function isGroupMember(groupId: string, userId: string): Promise<boolean> {
  const membership = await prisma.userGroup.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });
  return membership !== null;
}

export async function assignPermanence(input: {
  date: string;
  groupId: string;
  userId: string;
}): Promise<PlanningActionResult> {
  const account = await guard();
  if (!account) return { ok: false, error: "Acces refuse." };

  const parsed = assignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Donnees invalides." };

  const { date, groupId, userId } = parsed.data;
  const day = fromDateInput(date);
  const { weekYear, weekNumber } = getISOWeekInfo(day);

  if (!(await isGroupMember(groupId, userId))) {
    return { ok: false, error: "Cette personne n'appartient pas a ce groupe." };
  }

  try {
    const existing = await prisma.permanence.findUnique({
      where: { date_groupId: { date: day, groupId } },
    });

    let replaced = false;
    if (existing) {
      if (existing.userId === userId) {
        return { ok: true, unchanged: true, weekYear, weekNumber };
      }
      replaced = true;
      await prisma.permanence.update({
        where: { id: existing.id },
        data: { userId, updatedById: account.id },
      });
    } else {
      await prisma.permanence.create({
        data: {
          date: day,
          weekYear,
          weekNumber,
          groupId,
          userId,
          createdById: account.id,
          updatedById: account.id,
        },
      });
    }

    const needsResend = await hasPendingResend(weekYear, weekNumber);
    logger.info({ date, groupId, userId, replaced }, "planning.assign");
    revalidatePath("/planning");
    return { ok: true, replaced, needsResend, weekYear, weekNumber };
  } catch (error) {
    logger.error({ err: error }, "planning.assign.error");
    return { ok: false, error: "Erreur lors de l'enregistrement." };
  }
}

export async function removePermanence(input: {
  date: string;
  groupId: string;
}): Promise<PlanningActionResult> {
  const account = await guard();
  if (!account) return { ok: false, error: "Acces refuse." };

  const parsed = removeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Donnees invalides." };

  const { date, groupId } = parsed.data;
  const day = fromDateInput(date);
  const { weekYear, weekNumber } = getISOWeekInfo(day);

  try {
    await prisma.permanence.deleteMany({ where: { date: day, groupId } });
    const needsResend = await hasPendingResend(weekYear, weekNumber);
    logger.info({ date, groupId }, "planning.remove");
    revalidatePath("/planning");
    return { ok: true, removed: true, needsResend, weekYear, weekNumber };
  } catch (error) {
    logger.error({ err: error }, "planning.remove.error");
    return { ok: false, error: "Erreur lors de la suppression." };
  }
}

/**
 * Supprime toutes les permanences d'un groupe pour une semaine complete
 * (utilise depuis la vue annee, ou une cellule represente la semaine entiere).
 */
export async function removeWeekPermanence(input: {
  weekYear: number;
  weekNumber: number;
  groupId: string;
}): Promise<PlanningActionResult> {
  const account = await guard();
  if (!account) return { ok: false, error: "Acces refuse." };

  const parsed = removeWeekSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Donnees invalides." };

  const { weekYear, weekNumber, groupId } = parsed.data;
  const { start, end } = isoWeekRange(weekYear, weekNumber);

  try {
    await prisma.permanence.deleteMany({
      where: { groupId, date: { gte: start, lte: end } },
    });
    const needsResend = await hasPendingResend(weekYear, weekNumber);
    logger.info({ weekYear, weekNumber, groupId }, "planning.removeWeek");
    revalidatePath("/planning");
    return { ok: true, removed: true, needsResend, weekYear, weekNumber };
  } catch (error) {
    logger.error({ err: error }, "planning.removeWeek.error");
    return { ok: false, error: "Erreur lors de la suppression." };
  }
}

export async function fillWeek(input: {
  weekYear: number;
  weekNumber: number;
  groupId: string;
  userId: string;
}): Promise<PlanningActionResult> {
  const account = await guard();
  if (!account) return { ok: false, error: "Acces refuse." };

  const parsed = fillSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Donnees invalides." };

  const { weekYear, weekNumber, groupId, userId } = parsed.data;
  const { start, end } = isoWeekRange(weekYear, weekNumber);
  const days = weekDays(start);

  if (!(await isGroupMember(groupId, userId))) {
    return { ok: false, error: "Cette personne n'appartient pas a ce groupe." };
  }

  try {
    const existingCount = await prisma.permanence.count({
      where: { groupId, date: { gte: start, lte: end } },
    });

    await prisma.$transaction([
      prisma.permanence.deleteMany({
        where: { groupId, date: { gte: start, lte: end } },
      }),
      prisma.permanence.createMany({
        data: days.map((day) => ({
          date: day,
          weekYear,
          weekNumber,
          groupId,
          userId,
          createdById: account.id,
          updatedById: account.id,
        })),
      }),
    ]);

    const needsResend = await hasPendingResend(weekYear, weekNumber);
    logger.info({ weekYear, weekNumber, groupId, userId, replaced: existingCount > 0 }, "planning.fillWeek");
    revalidatePath("/planning");
    return {
      ok: true,
      replaced: existingCount > 0,
      needsResend,
      weekYear,
      weekNumber,
    };
  } catch (error) {
    logger.error({ err: error }, "planning.fillWeek.error");
    return { ok: false, error: "Erreur lors du remplissage de la semaine." };
  }
}
