import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL est requis"),
  APP_SECRET: z.string().min(16, "APP_SECRET doit contenir au moins 16 caracteres"),
  TIMEZONE: z.string().default("Europe/Paris"),
  LOG_LEVEL: z.string().default("info"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = JSON.stringify(parsed.error.flatten().fieldErrors);
    throw new Error(`Variables d'environnement invalides: ${details}`);
  }
  cached = parsed.data;
  return cached;
}
