import "dotenv/config";
import { hash, verify } from "@node-rs/argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL est requis pour le seed");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const hashOptions = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@example.com").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "admin";
  const syncPassword = (process.env.ADMIN_SYNC_PASSWORD ?? "true") !== "false";

  const existing = await prisma.account.findUnique({ where: { email } });

  if (!existing) {
    const passwordHash = await hash(password, hashOptions);
    await prisma.account.create({
      data: {
        email,
        passwordHash,
        role: "ADMIN",
        displayName: "Administrateur",
        activatedAt: new Date(),
      },
    });
    console.log(`Compte admin cree: ${email}`);
    return;
  }

  const passwordMatches = await verify(existing.passwordHash, password).catch(() => false);
  const passwordOutdated = syncPassword && !passwordMatches;
  const needsRepair =
    passwordOutdated || existing.role !== "ADMIN" || !existing.active || !existing.activatedAt;

  if (!needsRepair) {
    console.log(`Compte admin deja a jour: ${email}`);
    return;
  }

  await prisma.account.update({
    where: { id: existing.id },
    data: {
      ...(passwordOutdated ? { passwordHash: await hash(password, hashOptions) } : {}),
      ...(existing.activatedAt ? {} : { activatedAt: new Date() }),
      role: "ADMIN",
      active: true,
    },
  });
  console.log(
    passwordOutdated
      ? `Compte admin synchronise avec ADMIN_EMAIL/ADMIN_PASSWORD: ${email}`
      : `Compte admin reactive en tant qu'administrateur: ${email}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
