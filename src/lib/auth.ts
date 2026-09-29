import { cookies } from "next/headers";
import { prisma } from "./db";
import { generateToken, hashPassword, hashToken } from "./crypto";
import type { AccountRole } from "./roles";
import { isManagerRole } from "./roles";

export const SESSION_COOKIE = "permanence_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
export const ACCOUNT_TOKEN_TTL_MS = 1000 * 60 * 60 * 72;

export type AccountTokenType = "ACTIVATION" | "RESET";

export type { AccountRole } from "./roles";
export { ROLE_LABELS, isManagerRole } from "./roles";

export type SessionAccount = {
  id: string;
  email: string;
  displayName: string | null;
  role: AccountRole;
  userId: string | null;
  locale: string;
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
    locale: account.locale,
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

export async function requireManager(): Promise<SessionAccount> {
  const account = await requireAccount();
  if (!isManagerRole(account.role)) throw new Error("FORBIDDEN");
  return account;
}

export async function createAccountToken(
  accountId: string,
  type: AccountTokenType,
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + ACCOUNT_TOKEN_TTL_MS);
  await prisma.$transaction([
    prisma.accountToken.deleteMany({ where: { accountId, type, usedAt: null } }),
    prisma.accountToken.create({
      data: { accountId, type, tokenHash: hashToken(token), expiresAt },
    }),
  ]);
  return { token, expiresAt };
}

export async function findValidAccountToken(
  rawToken: string,
  type: AccountTokenType,
) {
  if (!rawToken) return null;
  const record = await prisma.accountToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { account: true },
  });
  if (!record) return null;
  if (record.type !== type) return null;
  if (record.usedAt) return null;
  if (record.expiresAt.getTime() < Date.now()) return null;
  return record;
}

export async function consumeAccountToken(tokenId: string): Promise<void> {
  await prisma.accountToken.update({
    where: { id: tokenId },
    data: { usedAt: new Date() },
  });
}

export async function invalidateAccountTokens(accountId: string): Promise<number> {
  const result = await prisma.accountToken.deleteMany({
    where: { accountId, usedAt: null },
  });
  return result.count;
}

export async function setAccountPassword(
  accountId: string,
  password: string,
): Promise<void> {
  const passwordHash = await hashPassword(password);
  const now = new Date();
  await prisma.account.update({
    where: { id: accountId },
    data: { passwordHash, activatedAt: now, active: true },
  });
  await prisma.session.deleteMany({ where: { accountId } });
  await prisma.accountToken.deleteMany({ where: { accountId, usedAt: null } });
}

export function passwordPolicyError(password: string): string | null {
  if (password.length < 8) {
    return "Le mot de passe doit contenir au moins 8 caracteres.";
  }
  return null;
}
