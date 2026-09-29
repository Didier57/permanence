import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion - Permanence" };

export default function LoginPage() {
  return (
    <AuthCard title="Permanence" subtitle="Gestion des permanences">
      <LoginForm />
      <p className="mt-4 text-center text-xs text-slate-400">
        <Link href="/mot-de-passe-oublie" className="hover:underline">
          Mot de passe oublie ?
        </Link>
      </p>
    </AuthCard>
  );
}
