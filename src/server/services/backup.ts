import { z } from "zod";
import { resolveLocale } from "@/lib/i18n";
import { fromDateInput, dateKey, getISOWeekInfo, toUTCDateOnly } from "@/lib/date";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export const BACKUP_VERSION = 2;

export type BackupData = {
  version: number;
  createdAt: string;
  users: {
    id: string;
    firstName: string;
    lastName: string;
    proPhone: string | null;
    privatePhone: string | null;
    email: string;
    active: boolean;
    locale: "fr" | "en";
    createdAt: string;
    updatedAt: string;
  }[];
  accounts: {
    email: string;
    displayName: string | null;
    role: "ADMIN" | "MANAGER" | "USER";
    active: boolean;
    activatedAt: string | null;
    passwordHash: string;
    userId: string | null;
    createdAt: string;
    updatedAt: string;
  }[];
  groups: {
    id: string;
    name: string;
    description: string | null;
    color: string | null;
    createdAt: string;
    updatedAt: string;
  }[];
  memberships: { userId: string; groupId: string; createdAt: string }[];
  permanences: {
    id: string;
    date: string;
    weekYear: number;
    weekNumber: number;
    userId: string;
    groupId: string;
    createdAt: string;
    updatedAt: string;
  }[];
  emailConfiguration: {
    smtpHost: string;
    smtpPort: number;
    smtpEncryption: "NONE" | "STARTTLS" | "SSL";
    smtpUser: string | null;
    smtpPasswordEncrypted: string | null;
    fromAddress: string;
    fromName: string | null;
    replyTo: string | null;
    ccRecipients: string[];
    schedules: {
      id: string;
      dayOfWeek: number;
      sendTime: string;
      weekOffset: number;
      enabled: boolean;
      kind: "PERSONNEL" | "CALLCENTER";
      extraRecipients: string[];
      publicToken: string | null;
    }[];
    timezone: string;
    enabled: boolean;
    introHtml: string | null;
    outroHtml: string | null;
  } | null;
  appConfiguration: {
    appUrl: string | null;
    callCenterEmail: string | null;
    timezone: string;
  } | null;
};

export async function createBackup(): Promise<BackupData> {
  const [
    users,
    accounts,
    groups,
    memberships,
    permanences,
    emailConfiguration,
    emailSchedules,
    appConfiguration,
  ] = await Promise.all([
    prisma.user.findMany({ orderBy: [{ lastName: "asc" }, { firstName: "asc" }] }),
    prisma.account.findMany({ orderBy: { email: "asc" } }),
    prisma.group.findMany({ orderBy: [{ position: "asc" }, { name: "asc" }] }),
    prisma.userGroup.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.permanence.findMany({ orderBy: [{ date: "asc" }, { groupId: "asc" }] }),
    prisma.emailConfiguration.findUnique({ where: { id: "default" } }),
    prisma.emailSchedule.findMany({ orderBy: [{ dayOfWeek: "asc" }, { sendTime: "asc" }] }),
    prisma.appConfiguration.findUnique({ where: { id: "default" } }),
  ]);

  return {
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    users: users.map((user) => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      proPhone: user.proPhone,
      privatePhone: user.privatePhone,
      email: user.email,
      active: user.active,
      locale: resolveLocale(user.locale),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    })),
    accounts: accounts.map((account) => ({
      email: account.email,
      displayName: account.displayName,
      role: account.role,
      active: account.active,
      activatedAt: account.activatedAt ? account.activatedAt.toISOString() : null,
      passwordHash: account.passwordHash,
      userId: account.userId,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
    })),
    groups: groups.map((group) => ({
      id: group.id,
      name: group.name,
      description: group.description,
      color: group.color,
      position: group.position,
      createdAt: group.createdAt.toISOString(),
      updatedAt: group.updatedAt.toISOString(),
    })),
    memberships: memberships.map((membership) => ({
      userId: membership.userId,
      groupId: membership.groupId,
      createdAt: membership.createdAt.toISOString(),
    })),
    permanences: permanences.map((permanence) => ({
      id: permanence.id,
      date: dateKey(permanence.date),
      weekYear: permanence.weekYear,
      weekNumber: permanence.weekNumber,
      userId: permanence.userId,
      groupId: permanence.groupId,
      createdAt: permanence.createdAt.toISOString(),
      updatedAt: permanence.updatedAt.toISOString(),
    })),
    emailConfiguration: emailConfiguration
      ? {
          smtpHost: emailConfiguration.smtpHost,
          smtpPort: emailConfiguration.smtpPort,
          smtpEncryption: emailConfiguration.smtpEncryption,
          smtpUser: emailConfiguration.smtpUser,
          smtpPasswordEncrypted: emailConfiguration.smtpPasswordEncrypted,
          fromAddress: emailConfiguration.fromAddress,
          fromName: emailConfiguration.fromName,
          replyTo: emailConfiguration.replyTo,
          ccRecipients: emailConfiguration.ccRecipients,
          schedules: emailSchedules.map((schedule) => ({
            id: schedule.id,
            dayOfWeek: schedule.dayOfWeek,
            sendTime: schedule.sendTime,
            weekOffset: schedule.weekOffset,
            enabled: schedule.enabled,
            kind: schedule.kind,
            extraRecipients: schedule.extraRecipients,
            publicToken: schedule.publicToken,
          })),
          timezone: emailConfiguration.timezone,
          enabled: emailConfiguration.enabled,
          introHtml: emailConfiguration.introHtml,
          outroHtml: emailConfiguration.outroHtml,
        }
      : null,
    appConfiguration: appConfiguration
      ? {
          appUrl: appConfiguration.appUrl,
          callCenterEmail: appConfiguration.callCenterEmail,
          timezone: appConfiguration.timezone,
        }
      : null,
  };
}

const backupSchema = z.object({
  version: z.number().int().optional(),
  createdAt: z.string().optional(),
  users: z
    .array(
      z.object({
        id: z.string().min(1),
        firstName: z.string(),
        lastName: z.string(),
        proPhone: z.string().nullish(),
        privatePhone: z.string().nullish(),
        email: z.string(),
        active: z.boolean().optional(),
        locale: z.enum(["fr", "en"]).optional(),
        createdAt: z.string().optional(),
        updatedAt: z.string().optional(),
      }),
    )
    .default([]),
  accounts: z
    .array(
      z.object({
        email: z.string().min(1),
        displayName: z.string().nullish(),
        role: z.enum(["ADMIN", "MANAGER", "USER"]).default("USER"),
        active: z.boolean().optional(),
        activatedAt: z.string().nullish(),
        passwordHash: z.string().min(1),
        userId: z.string().nullish(),
        createdAt: z.string().optional(),
        updatedAt: z.string().optional(),
      }),
    )
    .default([]),
  groups: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        description: z.string().nullish(),
        color: z.string().nullish(),
        position: z.number().int().nullish(),
        createdAt: z.string().optional(),
        updatedAt: z.string().optional(),
      }),
    )
    .default([]),
  memberships: z
    .array(
      z.object({
        userId: z.string().min(1),
        groupId: z.string().min(1),
        createdAt: z.string().optional(),
      }),
    )
    .default([]),
  permanences: z
    .array(
      z.object({
        id: z.string().optional(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide dans la sauvegarde"),
        userId: z.string().min(1),
        groupId: z.string().min(1),
        createdAt: z.string().optional(),
        updatedAt: z.string().optional(),
      }),
    )
    .default([]),
  emailConfiguration: z
    .object({
      smtpHost: z.string(),
      smtpPort: z.coerce.number().int().min(1).max(65535),
      smtpEncryption: z.enum(["NONE", "STARTTLS", "SSL"]).default("STARTTLS"),
      smtpUser: z.string().nullish(),
      smtpPasswordEncrypted: z.string().nullish(),
      fromAddress: z.string(),
      fromName: z.string().nullish(),
      replyTo: z.string().nullish(),
      ccRecipients: z.array(z.string()).default([]),
      schedules: z
        .array(
          z.object({
            id: z.string().optional(),
            dayOfWeek: z.coerce.number().int().min(0).max(6),
            sendTime: z.string(),
            weekOffset: z.coerce.number().int().min(0).max(1).default(1),
            enabled: z.boolean().default(true),
            kind: z.enum(["PERSONNEL", "CALLCENTER"]).default("PERSONNEL"),
            extraRecipients: z.array(z.string()).default([]),
            publicToken: z.string().nullish(),
          }),
        )
        .optional(),
      sendDayOfWeek: z.coerce.number().int().min(0).max(6).optional(),
      sendTime: z.string().optional(),
      timezone: z.string().default("Europe/Paris"),
      enabled: z.boolean().default(false),
      introHtml: z.string().nullish(),
      outroHtml: z.string().nullish(),
    })
    .nullish(),
    appConfiguration: z
      .object({
        appUrl: z.string().nullish(),
        callCenterEmail: z.string().nullish(),
        timezone: z.string().nullish(),
      })
      .nullish(),
});

export type RestoreMode = "replace" | "merge";

export function parseBackup(input: unknown) {
  return backupSchema.parse(input);
}

export type RestoreResult = {
  mode: RestoreMode;
  users: number;
  accounts: number;
  groups: number;
  memberships: number;
  permanences: number;
  emailConfiguration: boolean;
  appConfiguration: boolean;
  accountsRelinked: number;
};

function optionalDate(value: string | undefined | null): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
}

export async function restoreBackup(input: unknown, mode: RestoreMode): Promise<RestoreResult> {
  const data = parseBackup(input);
  const result = await prisma.$transaction(
    async (tx) => {
      const userIdMap = new Map<string, string>();
      const groupIdMap = new Map<string, string>();
      let membershipCount = 0;
      let permanenceCount = 0;
      let accountCount = 0;
      let emailConfigurationSaved = false;
      let appConfigurationSaved = false;

      if (mode === "replace") {
        await tx.permanence.deleteMany();
        await tx.userGroup.deleteMany();
        await tx.group.deleteMany();
        await tx.user.deleteMany();

        for (const user of data.users) {
          await tx.user.create({
            data: {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              proPhone: user.proPhone ?? null,
              privatePhone: user.privatePhone ?? null,
              email: user.email,
              active: user.active ?? true,
              locale: user.locale ?? "fr",
              createdAt: optionalDate(user.createdAt) ?? undefined,
            },
          });
          userIdMap.set(user.id, user.id);
        }

        for (const group of data.groups) {
          await tx.group.create({
            data: {
              id: group.id,
              name: group.name,
              description: group.description ?? null,
              color: group.color ?? null,
              position: group.position ?? 0,
              createdAt: optionalDate(group.createdAt) ?? undefined,
            },
          });
          groupIdMap.set(group.id, group.id);
        }
      } else {
        for (const user of data.users) {
          const existing = await tx.user.findFirst({
            where: { OR: [{ id: user.id }, { email: user.email }] },
          });
          if (existing) {
            await tx.user.update({
              where: { id: existing.id },
              data: {
                firstName: user.firstName,
                lastName: user.lastName,
                proPhone: user.proPhone ?? null,
                privatePhone: user.privatePhone ?? null,
                active: user.active ?? true,
                locale: user.locale ?? "fr",
              },
            });
            userIdMap.set(user.id, existing.id);
          } else {
            await tx.user.create({
              data: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                proPhone: user.proPhone ?? null,
                privatePhone: user.privatePhone ?? null,
                email: user.email,
                active: user.active ?? true,
                locale: user.locale ?? "fr",
                createdAt: optionalDate(user.createdAt) ?? undefined,
              },
            });
            userIdMap.set(user.id, user.id);
          }
        }

        for (const group of data.groups) {
          const existing = await tx.group.findFirst({
            where: { OR: [{ id: group.id }, { name: group.name }] },
          });
          if (existing) {
            await tx.group.update({
              where: { id: existing.id },
              data: {
                name: group.name,
                description: group.description ?? null,
                color: group.color ?? null,
                position: group.position ?? 0,
              },
            });
            groupIdMap.set(group.id, existing.id);
          } else {
            await tx.group.create({
              data: {
                id: group.id,
                name: group.name,
                description: group.description ?? null,
                color: group.color ?? null,
                position: group.position ?? 0,
                createdAt: optionalDate(group.createdAt) ?? undefined,
              },
            });
            groupIdMap.set(group.id, group.id);
          }
        }
      }

      for (const account of data.accounts) {
        const existing = await tx.account.findUnique({ where: { email: account.email } });
        const linkedUserId = account.userId ? (userIdMap.get(account.userId) ?? null) : null;
        const payload = {
          displayName: account.displayName ?? null,
          role: account.role,
          active: account.active ?? true,
          activatedAt: account.activatedAt ? optionalDate(account.activatedAt) ?? null : null,
          passwordHash: account.passwordHash,
        };
        if (existing) {
          await tx.account.update({
            where: { id: existing.id },
            data: { ...payload, userId: linkedUserId ?? existing.userId },
          });
        } else {
          await tx.account.create({
            data: {
              email: account.email,
              ...payload,
              userId: linkedUserId,
              createdAt: optionalDate(account.createdAt) ?? undefined,
            },
          });
        }
        accountCount += 1;
      }

      const activeAdmins = await tx.account.count({
        where: { role: "ADMIN", active: true },
      });
      if (activeAdmins === 0) {
        throw new Error(
          "La restauration ne laisserait aucun administrateur actif. Operation annulee.",
        );
      }

      for (const membership of data.memberships) {
        const userId = userIdMap.get(membership.userId);
        const groupId = groupIdMap.get(membership.groupId);
        if (!userId || !groupId) continue;
        const created = await tx.userGroup
          .create({
            data: {
              userId,
              groupId,
              createdAt: optionalDate(membership.createdAt) ?? undefined,
            },
          })
          .catch(() => null);
        if (created) membershipCount += 1;
      }

      for (const permanence of data.permanences) {
        const userId = userIdMap.get(permanence.userId);
        const groupId = groupIdMap.get(permanence.groupId);
        if (!userId || !groupId) continue;
        const date = fromDateInput(permanence.date);
        const { weekYear, weekNumber } = getISOWeekInfo(date);
        await tx.permanence.upsert({
          where: { date_groupId: { date, groupId } },
          create: {
            date,
            weekYear,
            weekNumber,
            userId,
            groupId,
            createdAt: optionalDate(permanence.createdAt) ?? undefined,
          },
          update: { userId, weekYear, weekNumber },
        });
        permanenceCount += 1;
      }

      if (data.emailConfiguration) {
        const config = data.emailConfiguration;
        const payload = {
          smtpHost: config.smtpHost,
          smtpPort: config.smtpPort,
          smtpEncryption: config.smtpEncryption,
          smtpUser: config.smtpUser ?? null,
          smtpPasswordEncrypted: config.smtpPasswordEncrypted ?? null,
          fromAddress: config.fromAddress,
          fromName: config.fromName ?? null,
          replyTo: config.replyTo ?? null,
          ccRecipients: config.ccRecipients,
          timezone: config.timezone,
          enabled: config.enabled,
          introHtml: config.introHtml ?? null,
          outroHtml: config.outroHtml ?? null,
        };
        await tx.emailConfiguration.upsert({
          where: { id: "default" },
          create: { id: "default", ...payload },
          update: payload,
        });

        // Les fichiers exportes avant les creneaux multiples ne contiennent
        // qu'un seul jour et une seule heure : on les convertit.
        const schedules: {
          id?: string;
          dayOfWeek: number;
          sendTime: string;
          weekOffset: number;
          enabled: boolean;
          kind?: "PERSONNEL" | "CALLCENTER";
          extraRecipients?: string[];
          publicToken?: string | null;
        }[] =
          config.schedules && config.schedules.length > 0
            ? config.schedules
            : [
                {
                  dayOfWeek: config.sendDayOfWeek ?? 3,
                  sendTime: config.sendTime ?? "09:00",
                  weekOffset: 1,
                  enabled: true,
                },
              ];
        await tx.emailSchedule.deleteMany();
        for (const schedule of schedules) {
          await tx.emailSchedule.create({
            data: {
              ...(schedule.id ? { id: schedule.id } : {}),
              dayOfWeek: schedule.dayOfWeek,
              sendTime: schedule.sendTime,
              weekOffset: schedule.weekOffset,
              enabled: schedule.enabled,
              kind: schedule.kind ?? "PERSONNEL",
              extraRecipients: schedule.extraRecipients ?? [],
              publicToken: schedule.publicToken ?? null,
            },
          });
        }
        emailConfigurationSaved = true;
      }

      if (
        data.appConfiguration &&
        (data.appConfiguration.appUrl ||
          data.appConfiguration.callCenterEmail ||
          data.appConfiguration.timezone)
      ) {
        const appUrl = data.appConfiguration.appUrl?.replace(/\/+$/, "") ?? null;
        const callCenterEmail = data.appConfiguration.callCenterEmail?.trim() || null;
        const timezone = data.appConfiguration.timezone?.trim() || "Europe/Paris";
        await tx.appConfiguration.upsert({
          where: { id: "default" },
          create: { id: "default", appUrl, callCenterEmail, timezone },
          update: { appUrl, callCenterEmail, timezone },
        });
        appConfigurationSaved = true;
      }

      const accountsToRelink = await tx.account.findMany({ where: { userId: null } });
      let accountsRelinked = 0;
      for (const account of accountsToRelink) {
        const user = await tx.user.findUnique({ where: { email: account.email } });
        if (!user) continue;
        await tx.account.update({ where: { id: account.id }, data: { userId: user.id } });
        accountsRelinked += 1;
      }

      return {
        mode,
        users: userIdMap.size,
        accounts: accountCount,
        groups: groupIdMap.size,
        memberships: membershipCount,
        permanences: permanenceCount,
        emailConfiguration: emailConfigurationSaved,
        appConfiguration: appConfigurationSaved,
        accountsRelinked,
      } satisfies RestoreResult;
    },
    { timeout: 120_000 },
  );

  logger.info({ ...result }, "backup.restored");
  return result;
}

export function backupFileName(reference = new Date()): string {
  const stamp = toUTCDateOnly(reference).toISOString().slice(0, 10);
  return `permanence-backup-${stamp}.json`;
}
