import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui";
import { getCurrentAccount, isManagerRole } from "@/lib/auth";
import { formatDateFr } from "@/lib/date";
import { prisma } from "@/lib/db";

export const metadata = { title: "Historique des emails - Permanence" };

const TYPE_LABELS: Record<string, string> = {
  AUTOMATIC: "Automatique",
  MANUAL: "Manuel",
  RESEND_AFTER_CHANGE: "Renvoi apres modification",
};

const STATUS_LABELS: Record<string, string> = {
  SUCCESS: "Succes",
  ERROR: "Erreur",
};

function formatDateTime(date: Date): string {
  const day = formatDateFr(date);
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  return `${day} ${hh}:${mm}`;
}

export default async function HistoryPage() {
  const account = await getCurrentAccount();
  if (!account || !isManagerRole(account.role)) {
    redirect("/planning");
  }

  const history = await prisma.emailHistory.findMany({
    orderBy: { sentAt: "desc" },
    take: 200,
    include: { planningVersion: { select: { id: true, contentHash: true } } },
  });

  return (
    <>
      <PageHeader
        title="Historique des emails"
        description="Trace de chaque envoi : date, semaine, type, destinataires et statut."
      />
      <main className="flex-1 p-6">
        <Card className="overflow-x-auto">
          {history.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">Aucun envoi enregistre.</p>
          ) : (
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date d&apos;envoi</th>
                  <th className="px-4 py-3">Semaine</th>
                  <th className="px-4 py-3">Periode</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Destinataires</th>
                  <th className="px-4 py-3">CC</th>
                  <th className="px-4 py-3">Statut</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => (
                  <tr key={entry.id} className="border-t border-slate-100 align-top">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {formatDateTime(entry.sentAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-800">
                      S{entry.weekNumber} / {entry.weekYear}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {formatDateFr(entry.weekStart)} - {formatDateFr(entry.weekEnd)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {TYPE_LABELS[entry.type] ?? entry.type}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="font-medium text-slate-800">{entry.recipients.length}</span>
                      <ul className="mt-1 flex flex-col gap-0.5 text-xs text-slate-500">
                        {entry.recipients.map((recipient) => (
                          <li key={recipient}>{recipient}</li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {entry.ccRecipients.length > 0 ? entry.ccRecipients.join(", ") : "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={
                          entry.status === "SUCCESS"
                            ? "rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
                            : "rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700"
                        }
                      >
                        {STATUS_LABELS[entry.status] ?? entry.status}
                      </span>
                      {entry.error ? (
                        <p className="mt-1 max-w-[220px] text-xs text-red-600">{entry.error}</p>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </main>
    </>
  );
}
