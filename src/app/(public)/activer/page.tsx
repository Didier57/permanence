import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { T } from "@/components/locale-provider";
import { SetPasswordForm } from "@/components/set-password-form";

export const metadata: Metadata = { title: "Activation du compte - Permanence" };

export default async function ActivatePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token.trim() : "";

  return (
    <AuthCard
      title="Permanence"
      subtitle={<T msg="Activation de votre compte : choisissez votre mot de passe." />}
    >
      <SetPasswordForm kind="ACTIVATION" token={token} />
      <p className="mt-4 text-center text-xs text-slate-400">
        <Link href="/login" className="hover:underline">
          <T msg="Retour a la connexion" />
        </Link>
      </p>
    </AuthCard>
  );
}
