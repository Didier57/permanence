import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

/** Decrit la base de donnees visee, sans divulguer les identifiants. */
export function databaseLabel(url: string | undefined): string {
  if (!url) return "(DATABASE_URL absente)";
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}:${parsed.port || "5432"}${parsed.pathname}`;
  } catch {
    return "(DATABASE_URL illisible)";
  }
}

/**
 * Verifie que la base visee par le worker porte bien le schema attendu.
 * Un worker branche sur une base non migree n'envoie jamais rien : mieux vaut
 * le dire clairement au demarrage que laisser echouer les tics en silence.
 */
export async function checkDatabase(): Promise<boolean> {
  const database = databaseLabel(process.env.DATABASE_URL);
  try {
    const columns = await prisma.$queryRaw<{ name: string }[]>`
      SELECT column_name AS name
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'email_configuration'
        AND column_name IN ('last_tick_at', 'last_tick_status')
    `;
    const schedules = await prisma.$queryRaw<{ reg: string | null }[]>`
      SELECT to_regclass('email_schedules')::text AS reg
    `;
    const missing = ["last_tick_at", "last_tick_status"].filter(
      (name) => !columns.some((column) => column.name === name),
    );
    const schedulesTable = schedules[0]?.reg ?? null;
    if (missing.length > 0 || !schedulesTable) {
      logger.error(
        { database, missingColumns: missing, emailSchedules: schedulesTable },
        "scheduler.database.outdated",
      );
      logger.error(
        {},
        "Base de donnees non a jour pour le worker : verifiez que le worker utilise la meme DATABASE_URL que l'application et que les migrations sont appliquees (docker compose pull && docker compose up -d).",
      );
      return false;
    }
    logger.info({ database }, "scheduler.database");
    return true;
  } catch (error) {
    logger.error({ err: error, database }, "scheduler.database.error");
    return false;
  }
}
