"use client";

import { useActionState, useState } from "react";
import { Alert, Button, Field, Input, Label } from "@/components/ui";
import { restoreBackupAction, type BackupActionState } from "@/server/backup-actions";

const INITIAL: BackupActionState = {};

export function RestoreForm() {
  const [state, action, pending] = useActionState(restoreBackupAction, INITIAL);
  const [mode, setMode] = useState<"merge" | "replace">("merge");

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field
        label="Fichier de sauvegarde"
        htmlFor="file"
        hint="Fichier JSON genere par l'export ci-dessus."
      >
        <Input id="file" name="file" type="file" accept="application/json,.json" required />
      </Field>

      <div className="flex flex-col gap-2">
        <Label>Mode de restauration</Label>
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input
            type="radio"
            name="mode"
            value="merge"
            className="mt-1"
            checked={mode === "merge"}
            onChange={() => setMode("merge")}
          />
          <span>
            <span className="font-medium text-slate-800">Mettre a jour les donnees</span>
            <span className="block text-slate-500">
              Chaque enregistrement du fichier met a jour l&apos;enregistrement correspondant
              (par identifiant, email ou nom), y compris les comptes d&apos;acces (mot de passe
              et role). Les donnees actuelles non presentes dans le fichier sont conservees.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input
            type="radio"
            name="mode"
            value="replace"
            className="mt-1"
            checked={mode === "replace"}
            onChange={() => setMode("replace")}
          />
          <span>
            <span className="font-medium text-red-700">Restauration complete</span>
            <span className="block text-slate-500">
              Les personnes, groupes et permanences actuels sont supprimes puis remplaces par
              le contenu du fichier. Les comptes d&apos;acces du fichier sont crees ou mis a jour,
              mais aucun compte existant n&apos;est supprime.
            </span>
          </span>
        </label>
      </div>

      {mode === "replace" ? (
        <label className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <input type="checkbox" name="confirmReplace" className="mt-0.5" />
          <span>
            Je confirme la suppression des donnees actuelles (personnel, groupes, planning)
            avant restauration. Les comptes d&apos;acces ne sont pas supprimes.
          </span>
        </label>
      ) : null}

      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}

      <div>
        <Button
          type="submit"
          variant={mode === "replace" ? "danger" : "primary"}
          disabled={pending}
        >
          {pending ? "Restauration..." : "Restaurer la sauvegarde"}
        </Button>
      </div>
    </form>
  );
}
