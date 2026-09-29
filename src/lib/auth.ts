import { cookies } from "next/headers";
import { prisma } from "./db";
import { generateToken, hashToken } from "./crypto";

export const SESSION_COOKIE = "permanence_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export type SessionAccount = {
  id: string;
  email: string;
  displayName: string | null;
  role: "ADMIN" | "USER";
  userId: string | null;
};

export async function createSession(
  accountId: string,
  meta?: { userAgent?: string | null; ip?: string | null },
): Promise<void> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      accountId,
      expiresAt,
      userAgent: meta?.userAgent ?? null,
      ip: meta?.ip ?? null,
    },
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function getCurrentAccount(): Promise<SessionAccount | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { account: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  if (!session.account.active) return null;
  const { account } = session;
  return {
    id: account.id,
    email: account.email,
    displayName: account.displayName,
    role: account.role,
    userId: account.userId,
  };
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  store.delete(SESSION_COOKIE);
}

export async function requireAccount(): Promise<SessionAccount> {
  const account = await getCurrentAccount();
  if (!account) throw new Error("UNAUTHENTICATED");
  return account;
}

export async function requireAdmin(): Promise<SessionAccount> {
  const account = await requireAccount();
  if (account.role !== "ADMIN") throw new Error("FORBIDDEN");
  return account;
}
