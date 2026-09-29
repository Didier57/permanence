import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";

export type AppConfigurationRecord = Awaited<ReturnType<typeof getAppConfiguration>>;

export async function getAppConfiguration() {
  return prisma.appConfiguration.findUnique({ where: { id: "default" } });
}

export function normalizeAppUrl(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, "");
}

export async function getAppUrl(): Promise<string> {
  const config = await getAppConfiguration();
  return (
    normalizeAppUrl(config?.appUrl) ??
    normalizeAppUrl(getEnv().APP_URL) ??
    "http://localhost:3000"
  );
}
