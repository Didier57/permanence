import cron from "node-cron";

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getEmailConfig, sendWeekEmail } from "@/server/services/email";
import { findDueSlots } from "./schedule";

export type TickResult = {
  status: "disabled" | "done";
  sent: number;
  skipped: number;
  empty: number;
  errors: string[];
  details: { weekYear: number; weekNumber: number; recipientCount?: number }[];
};

export async function runTick(reference: Date = new Date()): Promise<TickResult> {
  const config = await getEmailConfig();
  const result: TickResult = { status: "done", sent: 0, skipped: 0, empty: 0, errors: [], details: [] };
  if (!config) return { ...result, status: "disabled" };

  const slots = await prisma.emailSchedule.findMany({
    orderBy: [{ dayOfWeek: "asc" }, { sendTime: "asc" }],
  });
  const due = findDueSlots(
    slots,
    { enabled: config.enabled, timezone: config.timezone },
    reference,
  );

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
      continue;
    }

    const send = await sendWeekEmail({
      weekYear: item.weekYear,
      weekNumber: item.weekNumber,
      type: "AUTOMATIC",
      scheduleId: item.id,
    });
    if (!send.ok) {
      if (send.error === "Aucune permanence pour cette semaine.") {
        result.empty += 1;
        continue;
      }
      result.errors.push(send.error ?? "Erreur inconnue.");
      continue;
    }

    result.sent += 1;
    result.details.push({
      weekYear: item.weekYear,
      weekNumber: item.weekNumber,
      recipientCount: send.recipientCount,
    });
  }

  return result;
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
    if (result.status === "disabled") return;
    if (result.errors.length > 0) {
      logger.error({ errors: result.errors }, "scheduler.tick.error");
    }
    if (result.sent > 0) {
      logger.info(
        {
          sent: result.sent,
          skipped: result.skipped,
          empty: result.empty,
          details: result.details,
        },
        "scheduler.tick.sent",
      );
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
