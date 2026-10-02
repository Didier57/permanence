"use client";

import { useActionState, useState } from "react";
import { GlobeIcon } from "@/components/icons";
import { T, useTranslations, useLocale } from "@/components/locale-provider";
import { dayNameCapitalized, formatDayMonthFr } from "@/lib/date";
import { LOCALE_LABELS } from "@/lib/i18n";
import { setPublicLocaleAction, type LocaleActionState } from "@/server/locale-actions";
import type { PublicWeekView } from "@/server/services/public-week";

function PublicLanguageToggle() {
  const locale = useLocale();
  const t = useTranslations();
  const [state, formAction] = useActionState(setPublicLocaleAction, {} as LocaleActionState);
  const nextLocale = locale === "fr" ? "en" : "fr";
  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="locale" value={nextLocale} />
        <button
          type="submit"
          title={t("Changer de langue")}
          className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
        >
          <GlobeIcon className="h-4 w-4" />
          {LOCALE_LABELS[nextLocale]}
        </button>
      </form>
      {state.error ? <span className="mt-1 block text-xs text-red-600">{t(state.error)}</span> : null}
    </div>
  );
}

type PublicWeekUser = PublicWeekView["directory"][string];

function telHref(value: string): string {
  return `tel:${value.replace(/[^+0-9]/g, "")}`;
}

function UserInfoModal({ user, onClose }: { user: PublicWeekUser; onClose: () => void }) {
  const t = useTranslations();
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">{user.name}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700"
            aria-label={t("Fermer")}
          >
            &times;
          </button>
        </div>
        <dl className="flex flex-col gap-3 text-sm">
          <div>
            <dt className="text-slate-500">{t("Telephone professionnel")}</dt>
            <dd className="font-medium text-slate-900">
              {user.proPhone ? (
                <a href={telHref(user.proPhone)} className="text-sky-600 hover:underline">
                  {user.proPhone}
                </a>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">{t("Telephone prive")}</dt>
            <dd className="font-medium text-slate-900">
              {user.privatePhone ? (
                <a href={telHref(user.privatePhone)} className="text-sky-600 hover:underline">
                  {user.privatePhone}
                </a>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Email</dt>
            <dd className="font-medium text-slate-900">
              <a href={`mailto:${user.email}`} className="text-sky-600 hover:underline">
                {user.email}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">{t("Groupes")}</dt>
            <dd className="font-medium text-slate-900">
              {user.groups.length === 0 ? t("Aucun groupe.") : user.groups.join(", ")}
            </dd>
          </div>
        </dl>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {t("Fermer")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PublicWeekPlanning({ view }: { view: PublicWeekView }) {
  const locale = useLocale();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const weekStart = new Date(`${view.weekStart}T00:00:00Z`);
  const days = Array.from({ length: 7 }, (_, index) => new Date(weekStart.getTime() + index * 86_400_000));

  function entryFor(groupId: string, date: string) {
    return view.groups.find((group) => group.id === groupId)?.entries.find((entry) => entry.date === date);
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="mx-auto w-full max-w-[1600px]">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              <T msg="Planning des permanences" />
            </h1>
            <p className="text-sm text-slate-600">
              <T
                msg="Semaine {week} du {start} au {end}"
                vars={{
                  week: view.weekNumber,
                  start: formatDayMonthFr(new Date(`${view.weekStart}T00:00:00Z`)),
                  end: formatDayMonthFr(new Date(`${view.weekEnd}T00:00:00Z`)),
                }}
              />
            </p>
          </div>
          <PublicLanguageToggle />
        </header>

        {view.groups.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">
            <T msg="Aucune permanence pour cette semaine." />
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full table-fixed border-collapse">
              <thead>
                <tr>
                  <th className="w-40 border-b border-slate-200 p-2 text-left text-xs uppercase text-slate-500">
                    <T msg="Groupe" />
                  </th>
                  {days.map((day) => (
                    <th
                      key={day.toISOString()}
                      className="border-b border-l border-slate-200 p-2 text-center text-xs text-slate-600"
                    >
                      <div className="font-semibold">{dayNameCapitalized(day, locale)}</div>
                      <div className="text-[11px] text-slate-400">{formatDayMonthFr(day)}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {view.groups.map((group) => (
                  <tr key={group.id}>
                    <th
                      className="border-b border-slate-100 p-2 text-left text-sm font-medium text-slate-700"
                      title={group.description ?? undefined}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-3 w-3 rounded-full"
                          style={{ backgroundColor: group.color ?? "#0ea5e9" }}
                        />
                        {group.name}
                      </span>
                    </th>
                    {days.map((day) => {
                      const key = day.toISOString().slice(0, 10);
                      const entry = entryFor(group.id, key);
                      return (
                        <td key={key} className="border-b border-l border-slate-100 p-1 align-top">
                          {entry ? (
                            <div
                              style={{ borderLeftColor: group.color ?? "#0ea5e9" }}
                              className="flex min-w-0 items-center rounded border border-slate-200 border-l-4 bg-white px-2 py-1 text-xs text-slate-700"
                            >
                              <button
                                type="button"
                                onClick={() => setSelectedUserId(entry.userId)}
                                className="min-w-0 truncate text-left hover:underline"
                              >
                                {entry.userName}
                              </button>
                            </div>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedUserId && view.directory[selectedUserId] ? (
        <UserInfoModal user={view.directory[selectedUserId]} onClose={() => setSelectedUserId(null)} />
      ) : null}
    </div>
  );
}
