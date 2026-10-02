"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { restoreBackup, type RestoreMode } from "./services/backup";

export type BackupActionState = { ok?: boolean; error?: string; message?: string };

const modeSchema = z.enum(["replace", "merge"]);

const MODE_LABELS: Record<RestoreMode, string> = {
  replace: "restauration complete",
  merge: "mise a jour",
};

const MAX_SIZE = 20 * 1024 * 1024;

export async function restoreBackupAction(
  _prev: BackupActionState,
  formData: FormData,
): Promise<BackupActionState> {
  let account;
  try {
    account = await requireAdmin();
  } catch {
    return { error: "Acces refuse." };
  }

  const mode = modeSchema.safeParse(formData.get("mode")?.toString());
  if (!mode.success) {
    return { error: "Choisissez un mode de restauration." };
  }
  const restoreMode = mode.data as RestoreMode;

  if (restoreMode === "replace" && formData.get("confirmReplace") !== "on") {
    return {
      error:
        "Pour une restauration complete, cochez la case de confirmation (les donnees actuelles seront supprimees).",
    };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selectionnez un fichier de sauvegarde (.json)." };
  }
  if (file.size > MAX_SIZE) {
    return { error: "Fichier trop volumineux (20 Mo maximum)." };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(await file.text());
  } catch {
    return { error: "Le fichier de sauvegarde est illisible (JSON invalide)." };
  }

  try {
    const result = await restoreBackup(payload, restoreMode);
    logger.info(
      { by: account.email, mode: restoreMode, permanences: result.permanences },
      "backup.restore",
    );

    revalidatePath("/planning");
    revalidatePath("/personnel");
    revalidatePath("/groupes");
    revalidatePath("/emails");
    revalidatePath("/administration/configuration");
    revalidatePath("/historique");
    revalidatePath("/administration/sauvegarde");

    return {
      ok: true,
      message:
        `Restauration ${MODE_LABELS[restoreMode]} terminee : ` +
        `${result.users} personne(s), ${result.accounts} compte(s) d'acces, ` +
        `${result.groups} groupe(s), ${result.memberships} affectation(s) de groupe, ` +
        `${result.permanences} permanence(s).`,
    };
  } catch (error) {
    logger.error({ err: error, mode: restoreMode }, "backup.restore.failed");
    const detail = error instanceof Error ? error.message : "erreur inconnue";
    return { error: `La restauration a echoue : ${detail}` };
  }
}
