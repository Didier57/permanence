import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { SetPasswordForm } from "@/components/set-password-form";

export const metadata: Metadata = { title: "Reinitialisation du mot de passe - Permanence" };

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token.trim() : "";

  return (
    <AuthCard
      title="Permanence"
      subtitle="Reinitialisation : definissez un nouveau mot de passe."
    >
      <SetPasswordForm kind="RESET" token={token} />
      <p className="mt-4 text-center text-xs text-slate-400">
        <Link href="/mot-de-passe-oublie" className="hover:underline">
          Demander un nouveau lien
        </Link>
      </p>
    </AuthCard>
  );
}
