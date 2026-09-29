import { getCurrentAccount } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { backupFileName, createBackup } from "@/server/services/backup";

export async function GET() {
  const account = await getCurrentAccount();
  if (!account || account.role !== "ADMIN") {
    return new Response("Acces refuse.", { status: 403 });
  }

  const data = await createBackup();
  logger.info({ by: account.email }, "backup.exported");

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${backupFileName()}"`,
      "cache-control": "no-store",
    },
  });
}
