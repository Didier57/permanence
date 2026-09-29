import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { LanguageSelect } from "@/components/language-select";
import { T } from "@/components/locale-provider";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion - Permanence" };

export default function LoginPage() {
  return (
    <AuthCard title="Permanence" subtitle={<T msg="Gestion des permanences" />}>
      <LoginForm />
      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-slate-400">
          <Link href="/mot-de-passe-oublie" className="hover:underline">
            <T msg="Mot de passe oublie ?" />
          </Link>
        </p>
        <div className="w-32">
          <LanguageSelect scope="public" id="login-locale" />
        </div>
      </div>
    </AuthCard>
  );
}
