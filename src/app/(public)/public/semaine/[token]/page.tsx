import type { Metadata } from "next";
import { AuthCard } from "@/components/auth-card";
import { T } from "@/components/locale-provider";
import { getPublicWeekByToken } from "@/server/services/public-week";
import { PublicWeekPlanning } from "./public-week-planning";

export const metadata: Metadata = { title: "Planning de la semaine - Permanence" };

export default async function PublicWeekPage({ params }: PageProps<"/public/semaine/[token]">) {
  const { token } = await params;
  const result = await getPublicWeekByToken(token);

  if (!result.ok) {
    return (
      <AuthCard
        title="Permanence"
        subtitle={
          <T
            msg={result.reason === "expired" ? "Ce lien a expire." : "Ce lien n'est pas valide."}
          />
        }
      >
        <p className="text-center text-sm text-slate-500">
          <T msg="Contactez votre responsable pour obtenir un nouveau lien." />
        </p>
      </AuthCard>
    );
  }

  return <PublicWeekPlanning view={result.view} />;
}
