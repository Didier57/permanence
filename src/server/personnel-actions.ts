"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAccountToken, requireManager } from "@/lib/auth";
import { generateToken, hashPassword } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { buildAccountLinkUrl, sendAccountEmail } from "./services/email";
import { getAppUrl } from "./services/app-config";

export type ActionState = { ok?: boolean; error?: string; message?: string; link?: string };

const optionalPhone = z
  .string()
  .trim()
  .max(30)
  .optional()
  .or(z.literal(""));

const accessRole = z.enum(["NONE", "USER", "MANAGER", "ADMIN"]);

const ASSIGNABLE_ROLES = ["USER", "MANAGER", "ADMIN"] as const;

function isAssignableRole(value: string): value is "USER" | "MANAGER" | "ADMIN" {
  return (ASSIGNABLE_ROLES as readonly string[]).includes(value);
}

const userSchema = z.object({
  firstName: z.string().trim().min(1, "Le prenom est requis").max(100),
  lastName: z.string().trim().min(1, "Le nom est requis").max(100),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  proPhone: optionalPhone,
  privatePhone: optionalPhone,
  active: z.boolean(),
  accessRole: accessRole.default("NONE"),
});

export async function saveUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireManager();
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
    accessRole: (formData.get("accessRole")?.toString() || "NONE") as
      | "NONE"
      | "USER"
      | "MANAGER"
      | "ADMIN",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Donnees invalides." };
  }

  const id = formData.get("id")?.toString() || null;
  const groupIds = formData
    .getAll("groupIds")
    .map((value) => String(value))
    .filter(Boolean);

  const { firstName, lastName, email, accessRole } = parsed.data;
  const proPhone = parsed.data.proPhone?.trim() ? parsed.data.proPhone.trim() : null;
  const privatePhone = parsed.data.privatePhone?.trim() ? parsed.data.privatePhone.trim() : null;

  const duplicate = await prisma.user.findFirst({
    where: { email, ...(id ? { NOT: { id } } : {}) },
  });
  if (duplicate) {
    return { error: "Cet email est deja utilise par une autre personne." };
  }

  const displayName = `${firstName} ${lastName}`.trim();
  let userId = id;

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
    const created = await prisma.user.create({
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
    userId = created.id;
  }

  await syncAccountAccess({
    userId: userId as string,
    email,
    displayName,
    accessRole,
  });

  logger.info({ email, accessRole }, "user.saved");
  revalidatePath("/personnel");
  revalidatePath("/planning");
  revalidatePath("/configuration");
  return { ok: true, message: "Personne enregistree." };
}

async function syncAccountAccess(options: {
  userId: string;
  email: string;
  displayName: string;
  accessRole: "NONE" | "USER" | "MANAGER" | "ADMIN";
}) {
  const existing = await prisma.account.findUnique({ where: { userId: options.userId } });
  const byEmail = await prisma.account.findUnique({ where: { email: options.email } });

  if (options.accessRole === "NONE") {
    if (existing) {
      await prisma.account.update({ where: { id: existing.id }, data: { active: false } });
      await prisma.session.deleteMany({ where: { accountId: existing.id } });
    }
    return;
  }

  if (existing && byEmail && existing.id !== byEmail.id) {
    logger.warn({ userId: options.userId }, "account.link.conflict");
    return;
  }

  if (existing) {
    await prisma.account.update({
      where: { id: existing.id },
      data: { email: options.email, displayName: options.displayName, role: options.accessRole, active: true },
    });
    return;
  }

  const target = byEmail ?? null;
  if (target) {
    await prisma.account.update({
      where: { id: target.id },
      data: { userId: options.userId, displayName: options.displayName, role: options.accessRole, active: true },
    });
    return;
  }

  await prisma.account.create({
    data: {
      email: options.email,
      displayName: options.displayName,
      role: options.accessRole,
      userId: options.userId,
      active: true,
      passwordHash: await hashPassword(generateToken()),
    },
  });
}

export type InvitationState = {
  ok?: boolean;
  error?: string;
  message?: string;
  link?: string;
};

export async function sendAccountInvitation(
  _prev: InvitationState,
  formData: FormData,
): Promise<InvitationState> {
  let admin;
  try {
    admin = await requireManager();
  } catch {
    return { error: "Acces refuse." };
  }

  const userId = formData.get("userId")?.toString();
  if (!userId) return { error: "Utilisateur inconnu." };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Utilisateur inconnu." };

  const roleInput = (formData.get("role")?.toString() || "") as
    | "NONE"
    | "USER"
    | "MANAGER"
    | "ADMIN"
    | "";
  let account = await prisma.account.findUnique({ where: { userId } });

  if (!account) {
    const byEmail = await prisma.account.findUnique({ where: { email: user.email } });
    if (byEmail) {
      account = await prisma.account.update({
        where: { id: byEmail.id },
        data: {
          userId: user.id,
          displayName: `${user.firstName} ${user.lastName}`.trim(),
          role: isAssignableRole(roleInput) ? roleInput : "USER",
          active: true,
        },
      });
    } else {
      account = await prisma.account.create({
        data: {
          email: user.email,
          displayName: `${user.firstName} ${user.lastName}`.trim(),
          role: isAssignableRole(roleInput) ? roleInput : "USER",
          userId: user.id,
          active: true,
          passwordHash: await hashPassword(generateToken()),
        },
      });
    }
  } else if (isAssignableRole(roleInput)) {
    account = await prisma.account.update({
      where: { id: account.id },
      data: { role: roleInput, active: true },
    });
  }

  const kind = account.activatedAt ? "RESET" : "ACTIVATION";
  const { token, expiresAt } = await createAccountToken(account.id, kind);
  const url = buildAccountLinkUrl(token, kind, await getAppUrl());
  const result = await sendAccountEmail({
    to: account.email,
    kind,
    name: `${user.firstName} ${user.lastName}`.trim(),
    url,
    expiresAt,
  });

  logger.info({ userId, kind, sent: result.ok, by: admin.email }, "account.invitation");

  revalidatePath("/personnel");
  revalidatePath("/configuration");

  if (!result.ok) {
    return {
      ok: false,
      error: result.error ?? "Envoi impossible.",
      link: url,
      message:
        "L'email n'a pas pu etre envoye. Transmettez le lien ci-dessous a la personne concernee.",
    };
  }

  return {
    ok: true,
    message: account.activatedAt
      ? `Lien de reinitialisation envoye a ${account.email}.`
      : `Invitation envoyee a ${account.email}.`,
  };
}


export async function deleteUser(formData: FormData): Promise<void> {
  await requireManager();
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
