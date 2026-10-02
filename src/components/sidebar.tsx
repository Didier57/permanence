"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  DatabaseIcon,
  LayersIcon,
  LogoutIcon,
  MailIcon,
  SettingsIcon,
  ShieldIcon,
  UserIcon,
  UsersIcon,
} from "@/components/icons";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTranslations } from "@/components/locale-provider";
import { logoutAction } from "@/server/auth-actions";
import { ROLE_LABELS, type AccountRole } from "@/lib/roles";

type IconComponent = (props: { className?: string }) => React.ReactElement;

type NavItem = { href: string; label: string; icon: IconComponent };

const PLANNING_ITEM: NavItem = { href: "/planning", label: "Planning", icon: CalendarIcon };

const ADMIN_ITEMS: NavItem[] = [
  PLANNING_ITEM,
  { href: "/personnel", label: "Personnel", icon: UsersIcon },
  { href: "/groupes", label: "Groupes", icon: LayersIcon },
  { href: "/emails", label: "Emails", icon: MailIcon },
  { href: "/historique", label: "Historique des emails", icon: ClockIcon },
];

const ADMIN_SECTION: NavItem[] = [
  { href: "/administration/smtp", label: "SMTP", icon: MailIcon },
  { href: "/administration/sauvegarde", label: "Sauvegarde", icon: DatabaseIcon },
  { href: "/administration/configuration", label: "Configuration", icon: SettingsIcon },
];

const MANAGER_ITEMS: NavItem[] = [
  PLANNING_ITEM,
  { href: "/personnel", label: "Personnel", icon: UsersIcon },
  { href: "/groupes", label: "Groupes", icon: LayersIcon },
  { href: "/emails", label: "Emails", icon: MailIcon },
  { href: "/historique", label: "Historique des emails", icon: ClockIcon },
];

const USER_ITEMS: NavItem[] = [PLANNING_ITEM];

const ACCOUNT_ITEM: NavItem = { href: "/mon-compte", label: "Mon compte", icon: UserIcon };

const COLLAPSE_STORAGE_KEY = "permanence-sidebar";

export function Sidebar({
  role,
  displayName,
}: {
  role: AccountRole;
  displayName: string;
}) {
  const pathname = usePathname();
  const t = useTranslations();

  function toggleCollapsed() {
    const root = document.documentElement;
    const next = !root.classList.contains("sidebar-collapsed");
    root.classList.toggle("sidebar-collapsed", next);
    try {
      window.localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "collapsed" : "expanded");
    } catch {
      // Stockage indisponible : le menu reste dans l'etat choisi pour la session.
    }
  }

  const baseItems =
    role === "ADMIN" ? ADMIN_ITEMS : role === "MANAGER" ? MANAGER_ITEMS : USER_ITEMS;
  const items = [...baseItems, ACCOUNT_ITEM];

  const [adminOpen, setAdminOpen] = useState(
    () => role === "ADMIN" && ADMIN_SECTION.some((item) => pathname.startsWith(item.href)),
  );

  function renderLink(item: NavItem) {
    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        title={t(item.label)}
        className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition sidebar-collapsed:justify-center sidebar-collapsed:px-2 ${
          active
            ? "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300"
            : "text-slate-600 hover:bg-slate-100"
        }`}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span className="truncate sidebar-collapsed:hidden">{t(item.label)}</span>
      </Link>
    );
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] sidebar-collapsed:w-16">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sidebar-collapsed:justify-center sidebar-collapsed:px-2">
        <p className="text-lg font-bold text-slate-900 sidebar-collapsed:hidden">Permanence</p>
        <button
          type="button"
          onClick={toggleCollapsed}
          title={t("Reduire ou deplier le menu")}
          aria-label="RǸduire ou dǸplier le menu"
          className="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <ChevronLeftIcon className="h-5 w-5 sidebar-collapsed:hidden" />
          <ChevronRightIcon className="hidden h-5 w-5 sidebar-collapsed:block" />
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-3 sidebar-collapsed:px-2">
        {items.map(renderLink)}

        {role === "ADMIN" ? (
          <div className="mt-2 flex flex-col gap-1 border-t border-slate-200 pt-2">
            <button
              type="button"
              onClick={() => setAdminOpen((open) => !open)}
              title={t("Administrateur")}
              aria-expanded={adminOpen}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 sidebar-collapsed:justify-center sidebar-collapsed:px-2"
            >
              <ShieldIcon className="h-5 w-5 shrink-0" />
              <span className="flex-1 truncate text-left sidebar-collapsed:hidden">
                {t("Administrateur")}
              </span>
              <ChevronDownIcon
                className={`h-4 w-4 shrink-0 transition sidebar-collapsed:hidden ${
                  adminOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {adminOpen ? (
              <div className="flex flex-col gap-1 pl-4 sidebar-collapsed:pl-0">
                {ADMIN_SECTION.map(renderLink)}
              </div>
            ) : null}
          </div>
        ) : null}
      </nav>


      <div className="border-t border-slate-200 px-3 py-3 sidebar-collapsed:px-2">
        <p className="px-3 pb-2 text-xs text-slate-500 sidebar-collapsed:hidden">
          {displayName}
          <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
            {t(ROLE_LABELS[role])}
          </span>
        </p>
        <LanguageToggle />
        <ThemeToggle />
        <form action={logoutAction}>
          <button
            type="submit"
            title={t("Deconnexion")}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 sidebar-collapsed:justify-center sidebar-collapsed:px-2 dark:hover:bg-red-500/10"
          >
            <LogoutIcon className="h-5 w-5 shrink-0" />
            <span className="sidebar-collapsed:hidden">{t("Deconnexion")}</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
