import cron from "node-cron";

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getEmailConfig, sendWeekEmail, sendWeekLinkEmail } from "@/server/services/email";
import { getTimezone } from "@/server/services/app-config";
import { generateToken } from "@/lib/crypto";
import { getOrCreatePublicLink } from "@/server/services/public-link";
import { checkDatabase, databaseLabel } from "./database";
import { DEFAULT_CATCH_UP_MINUTES, findDueSlots, findMissedSlots } from "./schedule";

export type TickOutcome = "sent" | "empty" | "skipped";

export type TickDetail = {
  scheduleId: string;
  weekYear: number;
  weekNumber: number;
  status: TickOutcome;
  recipientCount?: number;
};

export type TickResult = {
  status: "disabled" | "done";
  sent: number;
  skipped: number;
  empty: number;
  errors: string[];
  details: TickDetail[];
};

export type TickOptions = {
  /**
   * Fenetre (minutes) pendant laquelle un declenchement manque est rattrape au
   * demarrage du worker. 0 desactive le rattrapage.
   */
  catchUpMinutes?: number;
};

export async function runTick(
  reference: Date = new Date(),
  options: TickOptions = {},
): Promise<TickResult> {
  const config = await getEmailConfig();
  const result: TickResult = { status: "done", sent: 0, skipped: 0, empty: 0, errors: [], details: [] };
  if (!config) return { ...result, status: "disabled" };

  const scope = { enabled: config.enabled, timezone: await getTimezone() };
  const slots = await prisma.emailSchedule.findMany({
    orderBy: [{ dayOfWeek: "asc" }, { sendTime: "asc" }],
  });
  const catchUpMinutes = options.catchUpMinutes ?? 0;
  const catchUp = catchUpMinutes > 0 ? findMissedSlots(slots, scope, reference, catchUpMinutes) : [];
  const due = [...findDueSlots(slots, scope, reference), ...catchUp];

  for (const item of due) {
    const alreadySent = await prisma.emailHistory.findFirst({
      where: {
        weekYear: item.weekYear,
        weekNumber: item.weekNumber,
        type: "AUTOMATIC",
        status: "SUCCESS",
        partial: false,
        scheduleId: item.id,
      },
      select: { id: true },
    });
    if (alreadySent) {
      result.skipped += 1;
      result.details.push({
        scheduleId: item.id,
        weekYear: item.weekYear,
        weekNumber: item.weekNumber,
        status: "skipped",
      });
      continue;
    }

    const send =
      item.kind === "CALLCENTER"
        ? await sendWeekLinkEmail({
            weekYear: item.weekYear,
            weekNumber: item.weekNumber,
            type: "AUTOMATIC",
            scheduleId: item.id,
            token: (await getOrCreatePublicLink(generateToken)).token,
            recipients: item.extraRecipients,
          })
        : await sendWeekEmail({
            weekYear: item.weekYear,
            weekNumber: item.weekNumber,
            type: "AUTOMATIC",
            scheduleId: item.id,
            recipients: item.kind === "PERSONNEL" && item.extraRecipients.length > 0 ? item.extraRecipients : undefined,
          });
    if (!send.ok) {
      if (send.error === "Aucune permanence pour cette semaine.") {
        result.empty += 1;
        result.details.push({
          scheduleId: item.id,
          weekYear: item.weekYear,
          weekNumber: item.weekNumber,
          status: "empty",
        });
        continue;
      }
      result.errors.push(
        `${send.error ?? "Erreur inconnue."} (creneau ${item.id}, semaine ${item.weekNumber}/${item.weekYear})`,
      );
      continue;
    }

    result.sent += 1;
    result.details.push({
      scheduleId: item.id,
      weekYear: item.weekYear,
      weekNumber: item.weekNumber,
      status: "sent",
      recipientCount: send.recipientCount,
    });
  }

  return result;
}

let running = false;

/** Enregistre le passage du worker pour que l'interface puisse le verifier. */
async function recordHeartbeat(status: string): Promise<void> {
  try {
    await prisma.emailConfiguration.updateMany({
      where: { id: "default" },
      data: { lastTickAt: new Date(), lastTickStatus: status },
    });
  } catch (error) {
    logger.error({ err: error }, "scheduler.heartbeat.error");
  }
}

async function safeTick(options: TickOptions = {}): Promise<void> {
  if (running) {
    logger.warn({}, "scheduler.tick.skipped");
    return;
  }
  running = true;
  try {
    const result = await runTick(new Date(), options);
    await recordHeartbeat(result.status);
    if (result.status === "disabled") return;
    if (result.errors.length > 0) {
      logger.error({ errors: result.errors }, "scheduler.tick.error");
    }
    if (result.details.length > 0) {
      logger.info(
        {
          sent: result.sent,
          skipped: result.skipped,
          empty: result.empty,
          catchUp: options.catchUpMinutes ?? 0,
          details: result.details,
        },
        "scheduler.tick.result",
      );
    }
  } catch (error) {
    logger.error({ err: error }, "scheduler.tick.exception");
    await recordHeartbeat("error");
  } finally {
    running = false;
  }
}

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "scheduler.shutdown");
  await prisma.$disconnect();
  process.exit(0);
}

async function main(): Promise<void> {
  const once = process.argv.includes("--once") || process.env.WORKER_RUN_ONCE === "true";

  if (once) {
    await checkDatabase();
    const result = await runTick(new Date(), { catchUpMinutes: DEFAULT_CATCH_UP_MINUTES });
    await recordHeartbeat(result.status);
    logger.info({ result }, "scheduler.once");
    await prisma.$disconnect();
    return;
  }

  logger.info({ database: databaseLabel(process.env.DATABASE_URL) }, "scheduler.started");
  await checkDatabase();
  // Controle immediat au demarrage, avec rattrapage des envois manques.
  void safeTick({ catchUpMinutes: DEFAULT_CATCH_UP_MINUTES });
  cron.schedule("* * * * *", () => {
    void safeTick();
  });

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

void main().catch((error: unknown) => {
  logger.error({ err: error }, "scheduler.start.error");
  process.exit(1);
});
