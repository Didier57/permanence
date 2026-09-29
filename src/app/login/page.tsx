import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion - Permanence" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Permanence</h1>
          <p className="mt-1 text-sm text-slate-500">Gestion des permanences</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
