import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { LanguageSelect } from "@/components/language-select";
import { T } from "@/components/locale-provider";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Mot de passe oublie - Permanence" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Permanence"
      subtitle={<T msg="Mot de passe oublie : recevez un lien par email." />}
    >
      <ForgotPasswordForm />
      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-slate-400">
          <Link href="/login" className="hover:underline">
            <T msg="Retour a la connexion" />
          </Link>
        </p>
        <div className="w-32">
          <LanguageSelect scope="public" id="forgot-locale" />
        </div>
      </div>
    </AuthCard>
  );
}
