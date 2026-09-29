import "dotenv/config";
import { hash } from "@node-rs/argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL est requis pour le seed");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "admin";

  const existing = await prisma.account.findUnique({ where: { email } });
  if (existing) {
    console.log(`Compte admin deja existant: ${email}`);
    return;
  }

  const passwordHash = await hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
  await prisma.account.create({
    data: {
      email,
      passwordHash,
      role: "ADMIN",
      displayName: "Administrateur",
    },
  });
  console.log(`Compte admin cree: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
