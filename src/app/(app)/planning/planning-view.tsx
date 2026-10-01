"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Button, Input } from "@/components/ui";
import { RecipientPickerModal } from "@/components/recipient-picker";
import {
  addDays,
  dateKey,
  dayName,
  dayNameCapitalized,
  endOfISOWeek,
  formatDayMonthFr,
  formatWeekRange,
  fromDateInput,
  getISOWeekInfo,
  monthEnd,
  monthName,
  monthStart,
  monthsRange,
  startOfISOWeek,
  weekDays,
} from "@/lib/date";
import { useLocale, useTranslations } from "@/components/locale-provider";
import { assignPermanence, fillWeek, removePermanence } from "@/server/planning-actions";
import { resendWeekEmail, sendWeekEmailNow } from "@/server/email-actions";

export type PlanningGroup = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  members: { id: string; name: string }[];
};

export type EntryMap = Record<string, Record<string, { userId: string; userName: string }>>;
export type UserInfo = {
  id: string;
  name: string;
  email: string;
  proPhone: string | null;
  privatePhone: string | null;
  groups: string[];
};

export type PlanningViewProps = {
  view: "week" | "month" | "year";
  anchor: string;
  canEdit: boolean;
  groups: PlanningGroup[];
  entries: EntryMap;
  pendingResend: { weekYear: number; weekNumber: number } | null;
  directory: Record<string, UserInfo>;
};

type DragPayload = { userId: string; groupId: string; userName: string };

function chipStyle(color: string | null): React.CSSProperties {
  return {
    borderLeftColor: color ?? "#0ea5e9",
  };
}

function DraggableUser({
  groupId,
  userId,
  name,
  color,
  disabled,
}: {
  groupId: string;
  userId: string;
  name: string;
  color: string | null;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `user:${groupId}:${userId}`,
    data: { userId, groupId, userName: name } satisfies DragPayload,
    disabled,
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ ...chipStyle(color), transform: CSS.Translate.toString(transform) }}
      className={`flex cursor-grab items-center gap-2 rounded-md border border-slate-200 border-l-4 bg-white px-2 py-1 text-sm text-slate-700 shadow-sm ${
        isDragging ? "opacity-40" : ""
      } ${disabled ? "cursor-default" : ""}`}
    >
      <span className="truncate">{name}</span>
    </div>
  );
}

function telHref(value: string): string {
  const cleaned = value.replace(/[^+0-9]/g, "");
  return `tel:${cleaned}`;
}

function UserInfoModal({ user, onClose }: { user: UserInfo; onClose: () => void }) {
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
          <Button variant="secondary" onClick={onClose}>
            {t("Fermer")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function DropCell({
  id,
  data,
  disabled,
  className,
  children,
  title,
}: {
  id: string;
  data: Record<string, unknown>;
  disabled: boolean;
  className?: string;
  children?: React.ReactNode;
  title?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, data, disabled });
  return (
    <div
      ref={setNodeRef}
      title={title}
      className={`${className ?? ""} ${isOver && !disabled ? "ring-2 ring-sky-400 ring-offset-1" : ""}`}
    >
      {children}
    </div>
  );
}

export function PlanningView({
  view,
  anchor,
  canEdit,
  groups,
  entries,
  pendingResend,
  directory,
}: PlanningViewProps) {
  const router = useRouter();
  const t = useTranslations();
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [active, setActive] = useState<DragPayload | null>(null);
  const [message, setMessage] = useState<{ tone: "error" | "success" | "info"; text: string } | null>(
    null,
  );
  const [unsent, setUnsent] = useState<{ weekYear: number; weekNumber: number } | null>(
    canEdit && pendingResend ? pendingResend : null,
  );
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const anchorDate = useMemo(() => fromDateInput(anchor), [anchor]);
  const today = dateKey(new Date());

  function navigate(nextView: "week" | "month" | "year", nextAnchor: string) {
    router.push(`/planning?view=${nextView}&date=${nextAnchor}`);
  }

  function move(delta: number) {
    if (view === "week") {
      navigate("week", dateKey(addDays(anchorDate, delta * 7)));
    } else if (view === "year") {
      const next = new Date(
        Date.UTC(anchorDate.getUTCFullYear(), anchorDate.getUTCMonth() + delta * 3, 1),
      );
      navigate("year", dateKey(next));
    } else {
      const next = new Date(Date.UTC(anchorDate.getUTCFullYear(), anchorDate.getUTCMonth() + delta, 1));
      navigate("month", dateKey(next));
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActive(event.active.data.current as DragPayload);
  }

  function isMemberOfGroup(userId: string, groupId: string): boolean {
    const group = groups.find((item) => item.id === groupId);
    return group ? group.members.some((member) => member.id === userId) : false;
  }

  function handleDragEnd(event: DragEndEvent) {
    setActive(null);
    const payload = event.active.data.current as DragPayload | undefined;
    const target = event.over?.data.current as
      | { type: "cell"; date: string; groupId: string }
      | { type: "week"; weekYear: number; weekNumber: number }
      | undefined;
    if (!payload || !target) return;
    if (!canEdit) {
      setMessage({ tone: "error", text: t("Seul un administrateur peut modifier le planning.") });
      return;
    }
    if (!isMemberOfGroup(payload.userId, target.type === "cell" ? target.groupId : payload.groupId)) {
      setMessage({ tone: "error", text: t("Cette personne n'appartient pas a ce groupe.") });
      return;
    }

    startTransition(async () => {
      if (target.type === "cell") {
        const result = await assignPermanence({
          date: target.date,
          groupId: target.groupId,
          userId: payload.userId,
        });
        if (!result.ok) {
          setMessage({ tone: "error", text: t(result.error ?? "Erreur.") });
          return;
        }
        if (result.unchanged) return;
        setMessage({
          tone: "success",
          text: result.replaced ? t("Permanence remplacee.") : t("Permanence enregistree."),
        });
        if (result.needsResend && result.weekYear && result.weekNumber) {
          setUnsent({ weekYear: result.weekYear, weekNumber: result.weekNumber });
        }
        return;
      }

      const existing = Object.entries(entries).some(([date, byGroup]) => {
        if (!byGroup[payload.groupId]) return false;
        const info = getISOWeekInfo(fromDateInput(date));
        return info.weekYear === target.weekYear && info.weekNumber === target.weekNumber;
      });
      if (
        existing &&
        !window.confirm(
          t("Cette operation va remplacer les permanences existantes de la semaine {week}. Continuer ?", {
            week: target.weekNumber,
          }),
        )
      ) {
        return;
      }

      const result = await fillWeek({
        weekYear: target.weekYear,
        weekNumber: target.weekNumber,
        groupId: payload.groupId,
        userId: payload.userId,
      });
      if (!result.ok) {
        setMessage({ tone: "error", text: t(result.error ?? "Erreur.") });
        return;
      }
      setMessage({
        tone: "success",
        text: t("Semaine {week} remplie pour {name}.", {
          week: target.weekNumber,
          name: payload.userName,
        }),
      });
      if (result.needsResend && result.weekYear && result.weekNumber) {
        setUnsent({ weekYear: result.weekYear, weekNumber: result.weekNumber });
      }
    });
  }

  function handleRemove(date: string, groupId: string) {
    if (!canEdit) return;
    startTransition(async () => {
      const result = await removePermanence({ date, groupId });
      if (!result.ok) {
        setMessage({ tone: "error", text: t(result.error ?? "Erreur.") });
        return;
      }
      setMessage({ tone: "success", text: t("Permanence supprimee.") });
      if (result.needsResend && result.weekYear && result.weekNumber) {
        setUnsent({ weekYear: result.weekYear, weekNumber: result.weekNumber });
      }
    });
  }

  const weekInfo = getISOWeekInfo(anchorDate);
  const weekStart = startOfISOWeek(anchorDate);
  const days = weekDays(weekStart);

  const weekRecipients = useMemo(() => {
    if (view !== "week") return [];
    const found = new Map<string, { id: string; name: string; email: string }>();
    for (const [date, byGroup] of Object.entries(entries)) {
      const info = getISOWeekInfo(fromDateInput(date));
      if (info.weekYear !== weekInfo.weekYear || info.weekNumber !== weekInfo.weekNumber) continue;
      for (const entry of Object.values(byGroup)) {
        const user = directory[entry.userId];
        if (!user || !user.email || found.has(user.email)) continue;
        found.set(user.email, { id: user.id, name: user.name, email: user.email });
      }
    }
    return [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [view, entries, directory, weekInfo.weekYear, weekInfo.weekNumber]);

  const monthInfo = useMemo(() => {
    if (view !== "month") return null;
    return {
      start: monthStart(anchorDate.getUTCFullYear(), anchorDate.getUTCMonth()),
      end: monthEnd(anchorDate.getUTCFullYear(), anchorDate.getUTCMonth()),
    };
  }, [view, anchorDate]);

  const monthWeeks = useMemo(() => {
    if (!monthInfo) return [];
    const gridStart = startOfISOWeek(monthInfo.start);
    const gridEnd = endOfISOWeek(monthInfo.end);
    const weeks: Date[] = [];
    let cursor = gridStart;
    while (cursor.getTime() <= gridEnd.getTime()) {
      weeks.push(cursor);
      cursor = addDays(cursor, 7);
    }
    return weeks;
  }, [monthInfo]);

  const yearWeeks = useMemo(() => {
    if (view !== "year") return [];
    const span = monthsRange(anchorDate, 3);
    const gridStart = startOfISOWeek(span.start);
    const gridEnd = endOfISOWeek(span.end);
    const weeks: Date[] = [];
    let cursor = gridStart;
    while (cursor.getTime() <= gridEnd.getTime()) {
      weeks.push(cursor);
      cursor = addDays(cursor, 7);
    }
    return weeks;
  }, [view, anchorDate]);

  const title =
    view === "week"
      ? t("Semaine {week} / {year} - {range}", {
          week: weekInfo.weekNumber,
          year: weekInfo.weekYear,
          range: formatWeekRange(weekStart, days[6], locale),
        })
      : view === "year"
        ? (() => {
            const span = monthsRange(anchorDate, 3);
            const startLabel = `${monthName(span.start.getUTCMonth(), locale)} ${span.start.getUTCFullYear()}`;
            const endLabel = `${monthName(span.end.getUTCMonth(), locale)} ${span.end.getUTCFullYear()}`;
            return `${startLabel} - ${endLabel}`;
          })()
        : `${monthName(anchorDate.getUTCMonth(), locale)} ${anchorDate.getUTCFullYear()}`;

  const currentWeekKey = `${weekInfo.weekYear}-${weekInfo.weekNumber}`;
  const pendingKeys = [unsent, pendingResend]
    .filter((item): item is { weekYear: number; weekNumber: number } => item !== null)
    .map((item) => `${item.weekYear}-${item.weekNumber}`);
  const showUnsentWarning = canEdit && view === "week" && pendingKeys.includes(currentWeekKey);

  const [sendingWeek, setSendingWeek] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);

  function openSendWeek() {
    if (weekRecipients.length === 0) {
      setMessage({ tone: "info", text: t("Aucune permanence pour cette semaine.") });
      return;
    }
    setSendOpen(true);
  }

  function confirmSendWeek(recipients: string[]) {
    const target = { weekYear: weekInfo.weekYear, weekNumber: weekInfo.weekNumber };
    const toEveryone = recipients.length === weekRecipients.length;
    const payload = { ...target, recipients: toEveryone ? null : recipients };
    setSendingWeek(true);
    startTransition(async () => {
      const result = showUnsentWarning
        ? await resendWeekEmail(payload)
        : await sendWeekEmailNow(payload);
      setSendingWeek(false);
      setSendOpen(false);
      if (!result.ok) {
        setMessage({ tone: "error", text: t(result.error ?? "Erreur lors de l'envoi.") });
        return;
      }
      if (!result.partial) setUnsent(null);
      setMessage({
        tone: "success",
        text: result.partial
          ? t(
              "Envoi partiel : {count} destinataire(s). L'envoi automatique programme partira dans tous les cas.",
              { count: result.recipientCount ?? recipients.length },
            )
          : t("Planning de la semaine {week} envoye a {count} destinataire(s).", {
              week: target.weekNumber,
              count: result.recipientCount ?? recipients.length,
            }),
      });
    });
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          {showUnsentWarning ? (
            <span className="text-base font-bold text-red-600">
              {t("La modification de la semaine en cours n'a pas été envoyée.")}
            </span>
          ) : null}
          <div className="flex overflow-hidden rounded-md border border-slate-300">
            <button
              type="button"
              onClick={() => navigate("week", anchor)}
              className={`px-3 py-1.5 text-sm ${view === "week" ? "bg-sky-600 text-on-brand" : "bg-white text-slate-600"}`}
            >
              {t("Semaine")}
            </button>
            <button
              type="button"
              onClick={() => navigate("month", anchor)}
              className={`px-3 py-1.5 text-sm ${view === "month" ? "bg-sky-600 text-on-brand" : "bg-white text-slate-600"}`}
            >
              {t("Mois")}
            </button>
            <button
              type="button"
              onClick={() => navigate("year", anchor)}
              className={`px-3 py-1.5 text-sm ${view === "year" ? "bg-sky-600 text-on-brand" : "bg-white text-slate-600"}`}
            >
              {t("Annee")}
            </button>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="secondary" onClick={() => move(-1)}>
              &larr;
            </Button>
            <Button variant="secondary" onClick={() => move(1)}>
              &rarr;
            </Button>
            <Button variant="secondary" onClick={() => navigate(view, dateKey(new Date()))}>
              {t("Aujourd'hui")}
            </Button>
            <Input
              type="date"
              value={anchor}
              onChange={(event) => {
                if (event.target.value) navigate(view, event.target.value);
              }}
              className="w-32! px-1! py-1! text-xs"
            />
          </div>
          <div className="ml-auto flex items-center gap-3">
            {isPending ? <span className="text-xs text-slate-400">{t("Enregistrement...")}</span> : null}
            {canEdit && view === "week" ? (
              <Button variant="secondary" onClick={openSendWeek} disabled={sendingWeek}>
                {sendingWeek ? t("Envoi...") : t("Envoyer la semaine par email")}
              </Button>
            ) : null}
            <span className="text-sm font-medium text-slate-700">{title}</span>
          </div>
        </div>

        {message ? (
          <div
            className={`rounded-md px-3 py-2 text-sm ${
              message.tone === "error"
                ? "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300"
                : message.tone === "success"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                  : "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300"
            }`}
          >
            {message.text}
          </div>
        ) : null}

        <div className="flex flex-1 gap-4">
          <aside className="w-64 shrink-0 self-start rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold text-slate-700">{t("Groupes")}</h2>
            <p className="mb-3 text-xs text-slate-400">
              {canEdit
                ? t("Glissez une personne sur le planning pour l'affecter.")
                : t("Consultation seule.")}
            </p>
            <div className="flex flex-col gap-2">
              {groups.length === 0 ? (
                <p className="text-xs text-slate-400">{t("Aucun groupe.")}</p>
              ) : (
                groups.map((group) => {
                  const isCollapsed = collapsed[group.id] ?? false;
                  return (
                    <div key={group.id} className="rounded-md border border-slate-100">
                      <button
                        type="button"
                        onClick={() =>
                          setCollapsed((prev) => ({ ...prev, [group.id]: !isCollapsed }))
                        }
                        className="flex w-full items-center justify-between px-2 py-1.5 text-left text-sm font-medium text-slate-700"
                        title={group.description ?? undefined}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block h-3 w-3 rounded-full"
                            style={{ backgroundColor: group.color ?? "#0ea5e9" }}
                          />
                          {group.name}
                        </span>
                        <span className="text-xs text-slate-400">{isCollapsed ? "+" : "-"}</span>
                      </button>
                      {isCollapsed ? null : (
                        <div className="flex flex-col gap-1 px-2 pb-2">
                          {group.members.length === 0 ? (
                            <p className="text-xs text-slate-400">{t("Aucun membre.")}</p>
                          ) : (
                            group.members.map((member) => (
                              <DraggableUser
                                key={`${group.id}:${member.id}`}
                                groupId={group.id}
                                userId={member.id}
                                name={member.name}
                                color={group.color}
                                disabled={!canEdit}
                              />
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          <main className="min-w-0 flex-1">
            {groups.length === 0 ? (
              <p className="text-sm text-slate-500">
                {t("Creez au moins un groupe pour commencer.")}
              </p>
            ) : view === "week" ? (
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                <table className="w-full min-w-[900px] border-collapse">
                  <thead>
                    <tr>
                      <th className="w-40 border-b border-slate-200 p-2 text-left text-xs uppercase text-slate-500">
                        {t("Groupe")}
                      </th>
                      {days.map((day) => (
                        <th
                          key={dateKey(day)}
                          className={`border-b border-l border-slate-200 p-2 text-center text-xs ${
                            dateKey(day) === today
                              ? "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300"
                              : "text-slate-600"
                          }`}
                        >
                          <div className="font-semibold">{dayNameCapitalized(day, locale)}</div>
                          <div className="text-[11px] text-slate-400">{formatDayMonthFr(day)}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((group) => (
                      <tr key={group.id}>
                        <th className="border-b border-slate-100 p-2 text-left text-sm font-medium text-slate-700">
                          <span className="flex items-center gap-2" title={group.description ?? undefined}>
                            <span
                              className="inline-block h-3 w-3 rounded-full"
                              style={{ backgroundColor: group.color ?? "#0ea5e9" }}
                            />
                            {group.name}
                          </span>
                        </th>
                        {days.map((day) => {
                          const key = dateKey(day);
                          const entry = entries[key]?.[group.id];
                          return (
                            <td key={key} className="border-b border-l border-slate-100 p-1 align-top">
                              <DropCell
                                id={`cell:${key}:${group.id}`}
                                data={{ type: "cell", date: key, groupId: group.id }}
                                disabled={
                                  !canEdit ||
                                  (active !== null && !isMemberOfGroup(active.userId, group.id))
                                }
                                className={`min-h-[52px] rounded p-1 ${
                                  dateKey(day) === today ? "bg-sky-50/50 dark:bg-sky-500/10" : ""
                                }`}
                              >
                                {entry ? (
                                  <div
                                    style={{ borderLeftColor: group.color ?? "#0ea5e9" }}
                                    className="flex items-center justify-between gap-1 rounded border border-slate-200 border-l-4 bg-white px-2 py-1 text-xs text-slate-700"
                                  >
                                    <button
                      type="button"
                      onClick={() => setSelectedUserId(entry.userId)}
                      className="truncate text-left hover:underline"
                    >
                      {entry.userName}
                    </button>
                                    {canEdit ? (
                                      <button
                                        type="button"
                                        onClick={() => handleRemove(key, group.id)}
                                        className="text-slate-400 hover:text-red-600"
                                        title={t("Retirer")}
                                      >
                                        &times;
                                      </button>
                                    ) : null}
                                  </div>
                                ) : null}
                              </DropCell>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : view === "month" ? (
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                <table className="w-full min-w-[900px] border-collapse">
                  <thead>
                    <tr>
                      <th className="w-16 border-b border-slate-200 p-2 text-left text-xs uppercase text-slate-500">
                        {t("Sem.")}
                      </th>
                      {days.map((day) => (
                        <th
                          key={dayName(day, locale)}
                          className="border-b border-l border-slate-200 p-2 text-center text-xs uppercase text-slate-500"
                        >
                          {dayName(day, locale)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {monthWeeks.map((weekStartOfRow) => {
                      const info = getISOWeekInfo(weekStartOfRow);
                      const rowDays = weekDays(weekStartOfRow);
                      return (
                        <tr key={dateKey(weekStartOfRow)}>
                          <DropCell
                            id={`week:${info.weekYear}:${info.weekNumber}`}
                            data={{ type: "week", weekYear: info.weekYear, weekNumber: info.weekNumber }}
                            disabled={!canEdit}
                            title={t("Remplir la semaine {week} (7 jours)", { week: info.weekNumber })}
                            className="border-b border-slate-100 bg-slate-50 p-2 text-center align-top"
                          >
                            <div className="text-sm font-semibold text-slate-700">
                              S{info.weekNumber}
                            </div>
                            <div className="text-[10px] text-slate-400">{t("remplir")}</div>
                          </DropCell>
                          {rowDays.map((day) => {
                            const key = dateKey(day);
                            const inMonth =
                              monthInfo !== null &&
                              day.getTime() >= monthInfo.start.getTime() &&
                              day.getTime() <= monthInfo.end.getTime();
                            const dayEntries = entries[key] ?? {};
                            const groupIds = Object.keys(dayEntries);
                            return (
                              <td
                                key={key}
                                className={`border-b border-l border-slate-100 p-1 align-top ${
                                  inMonth ? "" : "bg-slate-50/60"
                                }`}
                              >
                                <div
                                  className={`min-h-[64px] rounded p-0.5 ${
                                    key === today ? "bg-sky-50/50 dark:bg-sky-500/10" : ""
                                  }`}
                                >
                                  <div className="mb-1 text-[11px] text-slate-400">
                                    {formatDayMonthFr(day)}
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    {groupIds.map((groupId) => {
                                      const group = groups.find((item) => item.id === groupId);
                                      const entry = dayEntries[groupId];
                                      return (
                                        <div
                                          key={groupId}
                                          style={{ borderLeftColor: group?.color ?? "#0ea5e9" }}
                                          className="flex items-center justify-between gap-1 rounded border border-slate-200 border-l-4 bg-white px-1.5 py-0.5 text-[11px] text-slate-700"
                                        >
                                          <span className="truncate">
                                            <span
                                              className="text-slate-400"
                                              title={group?.description ?? undefined}
                                            >
                                              {group?.name ?? "?"} :
                                            </span>{" "}
                                            <button
                                              type="button"
                                              onClick={() => setSelectedUserId(entry.userId)}
                                              className="truncate text-left hover:underline"
                                            >
                                              {entry.userName}
                                            </button>
                                          </span>
                                          {canEdit ? (
                                            <button
                                              type="button"
                                              onClick={() => handleRemove(key, groupId)}
                                              className="text-slate-400 hover:text-red-600"
                                              title={t("Retirer")}
                                            >
                                              &times;
                                            </button>
                                          ) : null}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="w-20 border-b border-slate-200 p-2 text-left text-xs uppercase text-slate-500">
                        {t("Sem.")}
                      </th>
                      <th className="border-b border-l border-slate-200 p-2 text-left text-xs uppercase text-slate-500">
                        {t("Dates")}
                      </th>
                      {groups.map((group) => (
                        <th
                          key={group.id}
                          className="border-b border-l border-slate-200 p-2 text-left text-xs uppercase text-slate-500"
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
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {yearWeeks.map((weekStartOfRow) => {
                      const info = getISOWeekInfo(weekStartOfRow);
                      const rowEnd = addDays(weekStartOfRow, 6);
                      const rowDays = weekDays(weekStartOfRow);
                      return (
                        <tr key={dateKey(weekStartOfRow)}>
                          <DropCell
                            id={`week:${info.weekYear}:${info.weekNumber}`}
                            data={{ type: "week", weekYear: info.weekYear, weekNumber: info.weekNumber }}
                            disabled={!canEdit}
                            title={t("Remplir la semaine {week} (7 jours)", { week: info.weekNumber })}
                            className={`border-b border-slate-100 p-2 align-top ${
                              info.weekYear === weekInfo.weekYear && info.weekNumber === weekInfo.weekNumber
                                ? "bg-sky-50 dark:bg-sky-500/10"
                                : "bg-slate-50"
                            }`}
                          >
                            <div className="text-sm font-semibold text-slate-700">
                              S{info.weekNumber}
                            </div>
                          </DropCell>
                          <td className="border-b border-l border-slate-100 p-2 align-top text-sm text-slate-600">
                            <div className="whitespace-nowrap">
                              {formatDayMonthFr(weekStartOfRow)} &rarr; {formatDayMonthFr(rowEnd)}
                            </div>
                            <div
                              className={`text-[11px] ${
                                info.weekYear === weekInfo.weekYear && info.weekNumber === weekInfo.weekNumber
                                  ? "font-medium text-sky-700 dark:text-sky-300"
                                  : "text-slate-400"
                              }`}
                            >
                              {info.weekNumber === weekInfo.weekNumber ? t("Semaine en cours") : "\u00a0"}
                            </div>
                          </td>
                          {groups.map((group) => {
                            const assigned = rowDays.some((day) => entries[dateKey(day)]?.[group.id]);
                            const firstDay = rowDays.find((day) => entries[dateKey(day)]?.[group.id]);
                            const entry = firstDay ? entries[dateKey(firstDay)]?.[group.id] : undefined;
                            const sameAll = entry
                              ? rowDays.every((day) => {
                                  const candidate = entries[dateKey(day)]?.[group.id];
                                  return candidate && candidate.userId === entry.userId;
                                })
                              : false;
                            return (
                              <td
                                key={group.id}
                                className="border-b border-l border-slate-100 p-1 align-top"
                              >
                                {entry ? (
                                  <div
                                    style={{ borderLeftColor: group.color ?? "#0ea5e9" }}
                                    className="flex items-center justify-between gap-1 rounded border border-slate-200 border-l-4 bg-white px-1.5 py-0.5 text-[11px] text-slate-700"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => setSelectedUserId(entry.userId)}
                                      className="truncate text-left hover:underline"
                                    >
                                      {entry.userName}
                                      {sameAll ? "" : ` *`}
                                    </button>
                                  </div>
                                ) : assigned ? null : (
                                  <span className="text-[11px] text-slate-300">&mdash;</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </main>
        </div>
      </div>

      {selectedUserId && directory[selectedUserId] ? (
        <UserInfoModal
          user={directory[selectedUserId]}
          onClose={() => setSelectedUserId(null)}
        />
      ) : null}

      {sendOpen ? (
        <RecipientPickerModal
          title={t("Choisir les destinataires")}
          description={t(
            "Semaine {week} ({year}). L'envoi automatique programme partira dans tous les cas.",
            { week: weekInfo.weekNumber, year: weekInfo.weekYear },
          )}
          recipients={weekRecipients}
          pending={sendingWeek}
          onCancel={() => setSendOpen(false)}
          onConfirm={confirmSendWeek}
        />
      ) : null}

      <DragOverlay>
        {active ? (
          <div className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 shadow-md">
            {active.userName}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
