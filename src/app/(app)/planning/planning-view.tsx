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
import {
  addDays,
  dateKey,
  dayNameFr,
  dayNameFrCapitalized,
  endOfISOWeek,
  formatDayMonthFr,
  formatWeekRangeFr,
  fromDateInput,
  getISOWeekInfo,
  monthEnd,
  monthNameFr,
  monthStart,
  startOfISOWeek,
  weekDays,
} from "@/lib/date";
import { assignPermanence, fillWeek, removePermanence } from "@/server/planning-actions";
import { resendWeekEmail, sendWeekEmailNow } from "@/server/email-actions";

export type PlanningGroup = {
  id: string;
  name: string;
  color: string | null;
  members: { id: string; name: string }[];
};

export type EntryMap = Record<string, Record<string, { userId: string; userName: string }>>;

export type PlanningViewProps = {
  view: "week" | "month";
  anchor: string;
  isAdmin: boolean;
  groups: PlanningGroup[];
  entries: EntryMap;
  pendingResend: { weekYear: number; weekNumber: number } | null;
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
  isAdmin,
  groups,
  entries,
  pendingResend,
}: PlanningViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [active, setActive] = useState<DragPayload | null>(null);
  const [message, setMessage] = useState<{ tone: "error" | "success" | "info"; text: string } | null>(
    null,
  );
  const [resend, setResend] = useState<{ weekYear: number; weekNumber: number } | null>(
    isAdmin ? pendingResend : null,
  );
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const anchorDate = useMemo(() => fromDateInput(anchor), [anchor]);
  const today = dateKey(new Date());

  function navigate(nextView: "week" | "month", nextAnchor: string) {
    router.push(`/planning?view=${nextView}&date=${nextAnchor}`);
  }

  function move(delta: number) {
    if (view === "week") {
      navigate("week", dateKey(addDays(anchorDate, delta * 7)));
    } else {
      const next = new Date(Date.UTC(anchorDate.getUTCFullYear(), anchorDate.getUTCMonth() + delta, 1));
      navigate("month", dateKey(next));
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActive(event.active.data.current as DragPayload);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActive(null);
    const payload = event.active.data.current as DragPayload | undefined;
    const target = event.over?.data.current as
      | { type: "cell"; date: string; groupId: string }
      | { type: "week"; weekYear: number; weekNumber: number }
      | undefined;
    if (!payload || !target) return;
    if (!isAdmin) {
      setMessage({ tone: "error", text: "Seul un administrateur peut modifier le planning." });
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
          setMessage({ tone: "error", text: result.error ?? "Erreur." });
          return;
        }
        if (result.unchanged) return;
        setMessage({
          tone: "success",
          text: result.replaced ? "Permanence remplacee." : "Permanence enregistree.",
        });
        if (result.needsResend && result.weekYear && result.weekNumber) {
          setResend({ weekYear: result.weekYear, weekNumber: result.weekNumber });
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
          `Cette operation va remplacer les permanences existantes de la semaine ${target.weekNumber}. Continuer ?`,
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
        setMessage({ tone: "error", text: result.error ?? "Erreur." });
        return;
      }
      setMessage({
        tone: "success",
        text: `Semaine ${target.weekNumber} remplie pour ${payload.userName}.`,
      });
      if (result.needsResend && result.weekYear && result.weekNumber) {
        setResend({ weekYear: result.weekYear, weekNumber: result.weekNumber });
      }
    });
  }

  function handleRemove(date: string, groupId: string) {
    if (!isAdmin) return;
    startTransition(async () => {
      const result = await removePermanence({ date, groupId });
      if (!result.ok) {
        setMessage({ tone: "error", text: result.error ?? "Erreur." });
        return;
      }
      setMessage({ tone: "success", text: "Permanence supprimee." });
      if (result.needsResend && result.weekYear && result.weekNumber) {
        setResend({ weekYear: result.weekYear, weekNumber: result.weekNumber });
      }
    });
  }

  function handleResend() {
    if (!resend) return;
    const target = resend;
    startTransition(async () => {
      const result = await resendWeekEmail(target);
      setResend(null);
      if (!result.ok) {
        setMessage({ tone: "error", text: result.error ?? "Erreur." });
        return;
      }
      setMessage({ tone: "success", text: result.message ?? "Planning renvoye." });
    });
  }

  const weekInfo = getISOWeekInfo(anchorDate);
  const weekStart = startOfISOWeek(anchorDate);
  const days = weekDays(weekStart);

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

  const title =
    view === "week"
      ? `Semaine ${weekInfo.weekNumber} / ${weekInfo.weekYear} - ${formatWeekRangeFr(weekStart, days[6])}`
      : `${monthNameFr(anchorDate.getUTCMonth())} ${anchorDate.getUTCFullYear()}`;

  const [sendingWeek, setSendingWeek] = useState(false);

  function handleSendWeek() {
    const target = { weekYear: weekInfo.weekYear, weekNumber: weekInfo.weekNumber };
    const confirmed = window.confirm(
      `Envoyer par email le planning de la semaine ${target.weekNumber} (${target.weekYear}) ?`,
    );
    if (!confirmed) return;

    setSendingWeek(true);
    startTransition(async () => {
      const result = await sendWeekEmailNow(target);
      setSendingWeek(false);
      if (!result.ok) {
        setMessage({ tone: "error", text: result.error ?? "Erreur lors de l'envoi." });
        return;
      }
      setMessage({ tone: "success", text: result.message ?? "Planning envoye par email." });
    });
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex overflow-hidden rounded-md border border-slate-300">
            <button
              type="button"
              onClick={() => navigate("week", anchor)}
              className={`px-3 py-1.5 text-sm ${view === "week" ? "bg-sky-600 text-white" : "bg-white text-slate-600"}`}
            >
              Semaine
            </button>
            <button
              type="button"
              onClick={() => navigate("month", anchor)}
              className={`px-3 py-1.5 text-sm ${view === "month" ? "bg-sky-600 text-white" : "bg-white text-slate-600"}`}
            >
              Mois
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
              Aujourd&apos;hui
            </Button>
          </div>
          <Input
            type="date"
            value={anchor}
            onChange={(event) => {
              if (event.target.value) navigate(view, event.target.value);
            }}
            className="w-40"
          />
          <div className="ml-auto flex items-center gap-3">
            {isPending ? <span className="text-xs text-slate-400">Enregistrement...</span> : null}
            {isAdmin && view === "week" ? (
              <Button variant="secondary" onClick={handleSendWeek} disabled={sendingWeek}>
                {sendingWeek ? "Envoi..." : "Envoyer la semaine par email"}
              </Button>
            ) : null}
            <span className="text-sm font-medium text-slate-700">{title}</span>
          </div>
        </div>

        {message ? (
          <div
            className={`rounded-md px-3 py-2 text-sm ${
              message.tone === "error"
                ? "bg-red-50 text-red-700"
                : message.tone === "success"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-sky-50 text-sky-700"
            }`}
          >
            {message.text}
          </div>
        ) : null}

        <div className="flex flex-1 gap-4">
          <aside className="w-64 shrink-0 self-start rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold text-slate-700">Groupes</h2>
            <p className="mb-3 text-xs text-slate-400">
              {isAdmin
                ? "Glissez une personne sur le planning pour l'affecter."
                : "Consultation seule."}
            </p>
            <div className="flex flex-col gap-2">
              {groups.length === 0 ? (
                <p className="text-xs text-slate-400">Aucun groupe.</p>
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
                            <p className="text-xs text-slate-400">Aucun membre.</p>
                          ) : (
                            group.members.map((member) => (
                              <DraggableUser
                                key={`${group.id}:${member.id}`}
                                groupId={group.id}
                                userId={member.id}
                                name={member.name}
                                color={group.color}
                                disabled={!isAdmin}
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
                Creez au moins un groupe pour commencer.
              </p>
            ) : view === "week" ? (
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                <table className="w-full min-w-[900px] border-collapse">
                  <thead>
                    <tr>
                      <th className="w-40 border-b border-slate-200 p-2 text-left text-xs uppercase text-slate-500">
                        Groupe
                      </th>
                      {days.map((day) => (
                        <th
                          key={dateKey(day)}
                          className={`border-b border-l border-slate-200 p-2 text-center text-xs ${
                            dateKey(day) === today ? "bg-sky-50 text-sky-700" : "text-slate-600"
                          }`}
                        >
                          <div className="font-semibold">{dayNameFrCapitalized(day)}</div>
                          <div className="text-[11px] text-slate-400">{formatDayMonthFr(day)}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((group) => (
                      <tr key={group.id}>
                        <th className="border-b border-slate-100 p-2 text-left text-sm font-medium text-slate-700">
                          <span className="flex items-center gap-2">
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
                                disabled={!isAdmin}
                                className={`min-h-[52px] rounded p-1 ${
                                  dateKey(day) === today ? "bg-sky-50/50" : ""
                                }`}
                              >
                                {entry ? (
                                  <div
                                    style={{ borderLeftColor: group.color ?? "#0ea5e9" }}
                                    className="flex items-center justify-between gap-1 rounded border border-slate-200 border-l-4 bg-white px-2 py-1 text-xs text-slate-700"
                                  >
                                    <span className="truncate">{entry.userName}</span>
                                    {isAdmin ? (
                                      <button
                                        type="button"
                                        onClick={() => handleRemove(key, group.id)}
                                        className="text-slate-400 hover:text-red-600"
                                        title="Retirer"
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
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                <table className="w-full min-w-[900px] border-collapse">
                  <thead>
                    <tr>
                      <th className="w-16 border-b border-slate-200 p-2 text-left text-xs uppercase text-slate-500">
                        Sem.
                      </th>
                      {days.map((day) => (
                        <th
                          key={dayNameFr(day)}
                          className="border-b border-l border-slate-200 p-2 text-center text-xs uppercase text-slate-500"
                        >
                          {dayNameFr(day)}
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
                            disabled={!isAdmin}
                            title={`Remplir la semaine ${info.weekNumber} (7 jours)`}
                            className="border-b border-slate-100 bg-slate-50 p-2 text-center align-top"
                          >
                            <div className="text-sm font-semibold text-slate-700">
                              S{info.weekNumber}
                            </div>
                            <div className="text-[10px] text-slate-400">remplir</div>
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
                                    key === today ? "bg-sky-50/50" : ""
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
                                            <span className="text-slate-400">
                                              {group?.name ?? "?"} :
                                            </span>{" "}
                                            {entry.userName}
                                          </span>
                                          {isAdmin ? (
                                            <button
                                              type="button"
                                              onClick={() => handleRemove(key, groupId)}
                                              className="text-slate-400 hover:text-red-600"
                                              title="Retirer"
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
            )}
          </main>
        </div>
      </div>

      <DragOverlay>
        {active ? (
          <div className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 shadow-md">
            {active.userName}
          </div>
        ) : null}
      </DragOverlay>

      {resend && isAdmin ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <h2 className="mb-2 text-base font-semibold text-slate-800">
              Le planning a deja ete envoye
            </h2>
            <p className="mb-4 text-sm text-slate-600">
              Le planning de la semaine {resend.weekNumber} a ete modifie apres l&apos;envoi.
              Renvoyer le planning mis a jour a toutes les personnes concernees ?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setResend(null)}>
                Non, plus tard
              </Button>
              <Button onClick={handleResend} disabled={isPending}>
                Oui, renvoyer
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </DndContext>
  );
}
