"use client";

import { MoonIcon, SunIcon } from "@/components/icons";
import { useTranslations } from "@/components/locale-provider";

const STORAGE_KEY = "permanence-theme";

export function ThemeToggle() {
  const t = useTranslations();

  function toggleTheme() {
    const root = document.documentElement;
    const next = root.classList.contains("dark") ? "light" : "dark";
    root.classList.toggle("dark", next === "dark");
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Stockage indisponible (navigation privee) : le theme reste applique pour la session.
    }
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={t("Basculer entre le theme clair et sombre")}
      aria-label="Basculer entre le thème clair et sombre"
      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 sidebar-collapsed:justify-center sidebar-collapsed:px-2"
    >
      <MoonIcon className="h-5 w-5 shrink-0 dark:hidden" />
      <SunIcon className="hidden h-5 w-5 shrink-0 dark:block" />
      <span className="sidebar-collapsed:hidden dark:hidden">{t("Mode sombre")}</span>
      <span className="hidden sidebar-collapsed:hidden dark:inline">{t("Mode clair")}</span>
    </button>
  );
}
