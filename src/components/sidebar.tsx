"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/server/auth-actions";

type NavItem = { href: string; label: string };

const ADMIN_ITEMS: NavItem[] = [
  { href: "/planning", label: "Planning" },
  { href: "/personnel", label: "Personnel" },
  { href: "/groupes", label: "Groupes" },
  { href: "/emails", label: "Emails / SMTP" },
  { href: "/configuration", label: "Configuration" },
  { href: "/historique", label: "Historique des emails" },
];

const USER_ITEMS: NavItem[] = [{ href: "/planning", label: "Planning" }];

const ACCOUNT_ITEM: NavItem = { href: "/mon-compte", label: "Mon compte" };

export function Sidebar({
  role,
  displayName,
}: {
  role: "ADMIN" | "USER";
  displayName: string;
}) {
  const pathname = usePathname();
  const items = role === "ADMIN" ? [...ADMIN_ITEMS, ACCOUNT_ITEM] : [...USER_ITEMS, ACCOUNT_ITEM];

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <p className="text-lg font-bold text-slate-900">Permanence</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                active ? "bg-sky-100 text-sky-800" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <p className="px-3 pb-2 text-xs text-slate-500">
          {displayName}
          <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
            {role === "ADMIN" ? "Admin" : "Utilisateur"}
          </span>
        </p>
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            Deconnexion
          </button>
        </form>
      </div>
    </aside>
  );
}
