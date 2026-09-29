import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Mot de passe oublie - Permanence" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Permanence"
      subtitle="Mot de passe oublie : recevez un lien par email."
    >
      <ForgotPasswordForm />
      <p className="mt-4 text-center text-xs text-slate-400">
        <Link href="/login" className="hover:underline">
          Retour a la connexion
        </Link>
      </p>
    </AuthCard>
  );
}
