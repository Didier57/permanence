import cron from "node-cron";

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getEmailConfig, sendWeekEmail } from "@/server/services/email";
import { decideSchedule } from "./schedule";

export type TickResult =
  | { status: "disabled" }
  | { status: "invalid-time" }
  | { status: "not-due" }
  | { status: "already-sent"; weekYear: number; weekNumber: number }
  | { status: "empty"; weekYear: number; weekNumber: number }
  | { status: "sent"; weekYear: number; weekNumber: number; recipientCount?: number }
  | { status: "error"; error: string };

export async function runTick(reference: Date = new Date()): Promise<TickResult> {
  const config = await getEmailConfig();
  if (!config) return { status: "disabled" };

  const decision = decideSchedule(
    {
      enabled: config.enabled,
      timezone: config.timezone,
      sendDayOfWeek: config.sendDayOfWeek,
      sendTime: config.sendTime,
    },
    reference,
  );

  if (decision.status !== "due") return decision;

  const { weekYear, weekNumber } = decision;
  const alreadySent = await prisma.emailHistory.findFirst({
    where: { weekYear, weekNumber, type: "AUTOMATIC", status: "SUCCESS" },
    select: { id: true },
  });
  if (alreadySent) return { status: "already-sent", weekYear, weekNumber };

  const result = await sendWeekEmail({ weekYear, weekNumber, type: "AUTOMATIC" });
  if (!result.ok) {
    if (result.error === "Aucune permanence pour cette semaine.") {
      return { status: "empty", weekYear, weekNumber };
    }
    return { status: "error", error: result.error ?? "Erreur inconnue." };
  }

  return { status: "sent", weekYear, weekNumber, recipientCount: result.recipientCount };
}

let running = false;

async function safeTick(): Promise<void> {
  if (running) {
    logger.warn({}, "scheduler.tick.skipped");
    return;
  }
  running = true;
  try {
    const result = await runTick();
    if (result.status === "sent") {
      logger.info(
        {
          weekYear: result.weekYear,
          weekNumber: result.weekNumber,
          recipients: result.recipientCount,
        },
        "scheduler.tick.sent",
      );
    } else if (result.status === "error") {
      logger.error({ error: result.error }, "scheduler.tick.error");
    }
  } catch (error) {
    logger.error({ err: error }, "scheduler.tick.exception");
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
    const result = await runTick();
    logger.info({ result }, "scheduler.once");
    await prisma.$disconnect();
    return;
  }

  logger.info({}, "scheduler.started");
  cron.schedule("* * * * *", () => {
    void safeTick();
  });

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

void main();
