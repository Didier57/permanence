"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/server/auth-actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="identifier" className="text-sm font-medium text-slate-700">
          Identifiant ou email
        </label>
        <input
          id="identifier"
          name="identifier"
          type="text"
          autoComplete="username"
          autoFocus
          required
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:focus:ring-sky-500/30"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-slate-700">
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:focus:ring-sky-500/30"
        />
      </div>

      {state.error ? (
        <p
          className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-300"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-on-brand shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Connexion..." : "Se connecter"}
      </button>
    </form>
  );
}
