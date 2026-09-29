export type AccountRole = "ADMIN" | "MANAGER" | "USER";

export const ROLE_ORDER: AccountRole[] = ["ADMIN", "MANAGER", "USER"];

export const ROLE_LABELS: Record<AccountRole, string> = {
  ADMIN: "Administrateur",
  MANAGER: "Gestionnaire",
  USER: "Utilisateur",
};

export const ROLE_DESCRIPTIONS: Record<AccountRole, string> = {
  ADMIN: "Acces complet : planning, personnel, groupes, emails, comptes et sauvegarde.",
  MANAGER: "Gestion du planning, du personnel, des groupes et envoi des emails.",
  USER: "Consultation du planning uniquement.",
};

export function isManagerRole(role: AccountRole): boolean {
  return role === "ADMIN" || role === "MANAGER";
}

export function roleSortIndex(role: AccountRole): number {
  const index = ROLE_ORDER.indexOf(role);
  return index === -1 ? ROLE_ORDER.length : index;
}
