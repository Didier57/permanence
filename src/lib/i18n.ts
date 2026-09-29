export const LOCALES = ["fr", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "fr";

export const LOCALE_COOKIE = "permanence-locale";

export const LOCALE_LABELS: Record<Locale, string> = {
  fr: "Français",
  en: "English",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function resolveLocale(value: string | null | undefined): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/**
 * Dictionnaire anglais.
 *
 * La cle est le texte francais tel qu'il apparait dans l'interface (approche
 * "msgid" : le francais sert de langue de reference et de repli). Une chaine
 * absente du dictionnaire est affichee en francais.
 */
export const EN_MESSAGES: Record<string, string> = {
  // Navigation et interface
  Planning: "Schedule",
  Personnel: "Staff",
  Groupes: "Groups",
  "Emails / SMTP": "Emails / SMTP",
  Emails: "Emails",
  "Historique des emails": "Email history",
  Sauvegarde: "Backup",
  Configuration: "Configuration",
  "Mon compte": "My account",
  Deconnexion: "Sign out",
  "Mode sombre": "Dark mode",
  "Mode clair": "Light mode",
  "Basculer entre le theme clair et sombre": "Switch between light and dark theme",
  "Reduire ou deplier le menu": "Collapse or expand the menu",
  "Changer de langue": "Change language",

  // Roles
  Administrateur: "Administrator",
  Gestionnaire: "Manager",
  Utilisateur: "User",
  "Aucun acces": "No access",
  "Utilisateur (lecture seule)": "User (read only)",
  "Utilisateur simple (lecture seule)": "Standard user (read only)",
  "En attente d'activation": "Pending activation",
  "Acces desactive": "Access disabled",

  // Commun
  Enregistrer: "Save",
  Annuler: "Cancel",
  Modifier: "Edit",
  Supprimer: "Delete",
  Desactiver: "Disable",
  Fermer: "Close",
  Actions: "Actions",
  Acces: "Access",
  Nom: "Last name",
  Prenom: "First name",
  Email: "Email",
  Role: "Role",
  Etat: "Status",
  Actif: "Active",
  Inactif: "Inactive",
  inactif: "inactive",
  "(inactif)": "(inactive)",
  Optionnel: "Optional",
  Aucun: "None",
  Aucune: "None",
  "Enregistrement...": "Saving...",
  "Envoi...": "Sending...",
  "Modifier {name}": "Edit {name}",
  "Supprimer {name} ?": "Delete {name}?",
  Erreur: "Error",
  Succes: "Success",
  Type: "Type",
  Periode: "Period",
  Statut: "Status",
  Destinataires: "Recipients",

  // Authentification
  "Gestion des permanences": "Shift management",
  "Identifiant ou email": "Username or email",
  "Mot de passe": "Password",
  "Connexion...": "Signing in...",
  "Se connecter": "Sign in",
  Langue: "Language",
  Appliquer: "Apply",
  "Mot de passe oublie ?": "Forgot your password?",
  "Mot de passe oublie : recevez un lien par email.":
    "Forgot your password: receive a link by email.",
  "Retour a la connexion": "Back to sign in",
  "Adresse email": "Email address",
  "L'adresse associee a votre compte.": "The address linked to your account.",
  "Envoyer le lien de reinitialisation": "Send the reset link",
  "Activation de votre compte : choisissez votre mot de passe.":
    "Account activation: choose your password.",
  "Reinitialisation : definissez un nouveau mot de passe.": "Reset: set a new password.",
  "Lien incomplet ou invalide.": "Incomplete or invalid link.",
  "Demander un nouveau lien": "Request a new link",
  "Nouveau mot de passe": "New password",
  "8 caracteres minimum.": "At least 8 characters.",
  Confirmation: "Confirmation",
  "Enregistrer le mot de passe": "Save the password",
  "Informations de connexion et mot de passe.": "Sign-in information and password.",
  "Nom affiche": "Display name",
  Droits: "Rights",
  "Modifier mon mot de passe": "Change my password",
  "Mot de passe actuel": "Current password",
  "Laisser vide pour conserver le mot de passe actuel.": "Leave empty to keep the current password.",
  "Modifier le mot de passe": "Change the password",

  // Planning
  Semaine: "Week",
  Mois: "Month",
  "Aujourd'hui": "Today",
  "Sem.": "Wk.",
  remplir: "fill",
  Retirer: "Remove",
  "Remplir la semaine {week} (7 jours)": "Fill week {week} (7 days)",
  Groupe: "Group",
  "Glissez une personne sur le planning pour l'affecter.":
    "Drag a person onto the schedule to assign them.",
  "Consultation seule.": "Read only.",
  "Aucun groupe.": "No group.",
  "Aucun membre.": "No member.",
  "Creez au moins un groupe pour commencer.": "Create at least one group to get started.",
  "Cette personne n'appartient pas a ce groupe.": "This person does not belong to this group.",
  "Seul un administrateur peut modifier le planning.":
    "Only an administrator can change the schedule.",
  "Permanence remplacee.": "Shift replaced.",
  "Permanence enregistree.": "Shift saved.",
  "Permanence supprimee.": "Shift deleted.",
  "Semaine {week} remplie pour {name}.": "Week {week} filled for {name}.",
  "Cette operation va remplacer les permanences existantes de la semaine {week}. Continuer ?":
    "This will replace the existing shifts of week {week}. Continue?",
  "Envoyer par email le planning de la semaine {week} ({year}) ?":
    "Email the schedule for week {week} ({year})?",
  "Erreur lors de l'envoi.": "Error while sending.",
  "Planning envoye par email.": "Schedule sent by email.",
  "La modification de la semaine en cours n'a pas ete envoyee.":
    "The change to the current week has not been sent.",
  "Envoyer la semaine par email": "Email the week",
  "Semaine {week} / {year} - {range}": "Week {week} / {year} - {range}",

  // Personnel
  "Personnes et affectation aux groupes": "People and group assignment",
  "Nouvelle personne": "New person",
  "Telephone professionnel": "Work phone",
  "Telephone prive": "Home phone",
  "Tel. pro": "Work phone",
  "Tel. prive": "Home phone",
  "Langue des emails": "Email language",
  "Langue utilisee pour les emails envoyes a cette personne.":
    "Language used for emails sent to this person.",
  "Aucun groupe disponible.": "No group available.",
  "Acces a l'application": "Application access",
  "Utilisateur : consultation du planning uniquement. Gestionnaire : planning, personnel, groupes et envoi des emails. Administrateur : acces complet, comptes et sauvegarde.":
    "User: read-only schedule. Manager: schedule, staff, groups and email sending. Administrator: full access, accounts and backup.",
  Recherche: "Search",
  "Nom, email, telephone": "Name, email, phone",
  "Tous les groupes": "All groups",
  Filtrer: "Filter",
  "Aucune personne trouvee.": "No person found.",
  "Renvoyer l'invitation": "Resend invitation",
  Inviter: "Invite",
  "Reinitialiser le mot de passe": "Reset password",
  "Invitation envoyee a {email}.": "Invitation sent to {email}.",
  "Lien de reinitialisation envoye a {email}.": "Reset link sent to {email}.",
  "{name} possede des permanences historiques : la personne sera desactivee. Continuer ?":
    "{name} has shift history: the person will be disabled. Continue?",

  // Groupes
  "Un groupe regroupe des personnes. Un membre peut appartenir a plusieurs groupes.":
    "A group gathers people. A member can belong to several groups.",
  "Nouveau groupe": "New group",
  Couleur: "Color",
  Description: "Description",
  Membres: "Members",
  Permanences: "Shifts",
  "Aucune personne disponible.": "No person available.",
  "Aucun groupe pour le moment.": "No group yet.",
  "Supprimer le groupe {name} ?": "Delete group {name}?",
  "Des permanences existent pour ce groupe": "Shifts exist for this group",

  // Emails / SMTP
  "Configuration du serveur SMTP et envoi des plannings aux personnes concernees.":
    "SMTP server configuration and sending schedules to the people concerned.",
  "Envoi des plannings aux personnes concernees.":
    "Send schedules to the people concerned.",
  "Configuration SMTP": "SMTP configuration",
  "Envoi manuel": "Manual send",
  "Envoie immediatement le planning complet d'une semaine a toutes les personnes concernees.":
    "Immediately sends the full schedule of a week to all the people concerned.",
  "Serveur SMTP": "SMTP server",
  Port: "Port",
  Chiffrement: "Encryption",
  "Utilisateur SMTP": "SMTP user",
  "Mot de passe SMTP": "SMTP password",
  "Un mot de passe est enregistre. Laisser vide pour le conserver.":
    "A password is saved. Leave empty to keep it.",
  "Aucun mot de passe enregistre.": "No saved password.",
  "Supprimer le mot de passe enregistre": "Delete the saved password",
  "Adresse d'expedition": "Sender address",
  "Nom d'expedition": "Sender name",
  "Adresse de reponse (reply-to)": "Reply-to address",
  "Copie (CC)": "Copy (CC)",
  "Adresses separees par des virgules.": "Addresses separated by commas.",
  "Envoi automatique": "Automatic sending",
  Active: "Enabled",
  "Jour d'envoi": "Send day",
  "Heure d'envoi": "Send time",
  "Fuseau horaire": "Time zone",
  "Modele du message": "Message template",
  "Ces textes sont inseres dans l'email, au-dessus puis en dessous du planning. Laissez vide pour ne rien ajouter.":
    "These texts are inserted in the email, above then below the schedule. Leave empty to add nothing.",
  "Texte au-dessus du planning": "Text above the schedule",
  "Insere juste apres le numero de semaine et les dates, avant la liste des groupes.":
    "Inserted right after the week number and the dates, before the list of groups.",
  "Texte en dessous du planning": "Text below the schedule",
  "Insere apres la liste des groupes, en fin d'email.":
    "Inserted after the list of groups, at the end of the email.",
  "Ex. Merci de prevenir en cas d'empechement.":
    "E.g. Please let us know if you cannot make it.",
  "Ex. Contact : responsable@exemple.fr": "E.g. Contact: manager@example.com",
  "Enregistrer la configuration": "Save the configuration",
  "Destinataire du test": "Test recipient",
  "Par defaut : {email}": "Default: {email}",
  "Test en cours...": "Testing...",
  "Tester la configuration SMTP": "Test the SMTP configuration",
  "Envoyer le planning d'une semaine": "Send the schedule of a week",
  "Choisir une date appartenant a la semaine a envoyer.":
    "Pick a date within the week to send.",
  "Envoyer maintenant": "Send now",
  Lundi: "Monday",
  Mardi: "Tuesday",
  Mercredi: "Wednesday",
  Jeudi: "Thursday",
  Vendredi: "Friday",
  Samedi: "Saturday",
  Dimanche: "Sunday",
  "Nom de la personne": "Person name",

  // Historique
  "Trace de chaque envoi : date, semaine, type, destinataires et statut.":
    "Log of every send: date, week, type, recipients and status.",
  "Aucun envoi enregistre.": "No send recorded.",
  "Date d'envoi": "Send date",
  Automatique: "Automatic",
  Manuel: "Manual",
  "Renvoi apres modification": "Resend after change",

  // Sauvegarde
  "Export et restauration des donnees de l'application.":
    "Export and restore of the application data.",
  "Contenu de la sauvegarde": "Backup content",
  "Restaurer une sauvegarde": "Restore a backup",
  "Le fichier exporte contient le personnel, les comptes d'acces (empreintes des mots de passe, roles et etat), les groupes et leurs affectations, le planning des permanences, la configuration du site (identifiants SMTP chiffres, expediteur, CC, jour et heure d'envoi) ainsi que l'adresse publique. L'historique des emails et les liens d'activation en cours ne sont pas inclus.":
    "The exported file contains the staff, the access accounts (password hashes, roles and status), the groups and their assignments, the shift schedule, the site configuration (encrypted SMTP credentials, sender, CC, send day and time) and the public address. The email history and pending activation links are not included.",
  "La restauration remplace ou met a jour les personnes, groupes et permanences. Les comptes d'acces du fichier sont crees ou mis a jour (empreinte du mot de passe, role, etat) sans jamais supprimer les comptes existants : un compte dont la personne est retrouvee par son email est automatiquement relie a nouveau. La restauration est refusee si elle ne laisserait aucun administrateur actif.":
    "The restore replaces or updates the people, groups and shifts. The access accounts from the file are created or updated (password hash, role, status) without ever deleting existing accounts: an account whose person is found again by email is automatically linked again. The restore is refused if it would leave no active administrator.",
  Personnes: "People",
  "Comptes d'acces": "Access accounts",
  affectations: "assignments",
  "Configuration email": "Email configuration",
  Activee: "Enabled",
  Enregistree: "Saved",
  "Adresse publique configuree :": "Configured public address:",
  "valeur par defaut du serveur": "server default value",
  "Telecharger la sauvegarde": "Download the backup",
  "Fichier de sauvegarde": "Backup file",
  "Fichier JSON genere par l'export ci-dessus.": "JSON file generated by the export above.",
  "Mode de restauration": "Restore mode",
  "Mettre a jour les donnees": "Update the data",
  "Chaque enregistrement du fichier met a jour l'enregistrement correspondant (par identifiant, email ou nom), y compris les comptes d'acces (mot de passe et role). Les donnees actuelles non presentes dans le fichier sont conservees.":
    "Each record from the file updates the matching record (by identifier, email or name), including the access accounts (password and role). The current data not present in the file is kept.",
  "Restauration complete": "Full restore",
  "Les personnes, groupes et permanences actuels sont supprimes puis remplaces par le contenu du fichier. Les comptes d'acces du fichier sont crees ou mis a jour, mais aucun compte existant n'est supprime.":
    "The current people, groups and shifts are deleted and replaced by the content of the file. The access accounts from the file are created or updated, but no existing account is deleted.",
  "Je confirme la suppression des donnees actuelles (personnel, groupes, planning) avant restauration. Les comptes d'acces ne sont pas supprimes.":
    "I confirm the deletion of the current data (staff, groups, schedule) before restoring. The access accounts are not deleted.",
  "Restauration...": "Restoring...",
  "Restaurer la sauvegarde": "Restore the backup",

  // Configuration
  "Comptes d'acces et droits (administrateur, gestionnaire ou utilisateur simple).":
    "Access accounts and rights (administrator, manager or standard user).",
  "Adresse du site": "Site address",
  "Utilisee pour construire les liens envoyes par email (activation, reinitialisation). Laissez vide pour utiliser la valeur par defaut.":
    "Used to build the links sent by email (activation, reset). Leave empty to use the default value.",
  "Adresse actuellement utilisee :": "Address currently in use:",
  "Enregistrer l'adresse": "Save the address",
  "Comptes et droits": "Accounts and rights",
  Informations: "Information",
  "Numeros de semaine": "Week numbers",
  "Norme ISO 8601, lundi comme premier jour.": "ISO 8601 standard, Monday as the first day.",
  "Fuseau horaire d'envoi": "Sending time zone",
  "Configure dans le module Emails / SMTP.": "Configured in the Emails / SMTP module.",
  "Adresse email (identifiant)": "Email address (username)",
  "Personne liee": "Linked person",
  "Optionnel : relie ce compte a une personne du planning.":
    "Optional: links this account to a person in the schedule.",
  "Compte actif": "Active account",
  "Mettre a jour": "Update",
  "Creer le compte": "Create the account",
  "Nouveau compte": "New account",
  "Supprimer ce compte ?": "Delete this account?",

  // Editeur de texte enrichi
  "Adresse du lien (https://...)": "Link address (https://...)",
  Gras: "Bold",
  Italique: "Italic",
  Souligne: "Underline",
  Barre: "Strikethrough",
  Police: "Font",
  "Taille de police": "Font size",
  "Couleur du texte": "Text color",
  "Couleur {color}": "Color {color}",
  Surligner: "Highlight",
  Titre: "Heading",
  "Sous-titre": "Subheading",
  Paragraphe: "Paragraph",
  "Inserer un lien": "Insert a link",
  Lien: "Link",
  "Retirer le lien": "Remove the link",
  "Sans lien": "No link",
  "Liste a puces": "Bullet list",
  Liste: "List",
  "Liste numerotee": "Numbered list",
  "Aligner a gauche": "Align left",
  Gauche: "Left",
  Centrer: "Center",
  Centre: "Center",
  "Aligner a droite": "Align right",
  Droite: "Right",
  "Effacer la mise en forme": "Clear formatting",
  Effacer: "Clear",
  "Modifier le code HTML": "Edit the HTML code",
  "Revenir a l'editeur visuel": "Back to the visual editor",
  Visuel: "Visual",
  "Choisir une couleur": "Choose a color",
  "Par defaut": "Default",
  Taille: "Size",
  "Tres petit": "Very small",
  Petit: "Small",
  Normal: "Normal",
  Moyen: "Medium",
  Grand: "Large",
  "Tres grand": "Very large",
  Enorme: "Huge",

  // Messages renvoyes par les actions serveur
  "Acces refuse.": "Access denied.",
  "Identifiant et mot de passe requis.": "Username and password required.",
  "Identifiants invalides.": "Invalid credentials.",
  "Ce compte n'est pas encore active. Utilisez le lien d'activation recu par email ou demandez un nouveau lien.":
    "This account is not activated yet. Use the activation link received by email or request a new link.",
  "Langue inconnue.": "Unknown language.",
  "Langue enregistree.": "Language saved.",
  "Un groupe porte deja ce nom.": "A group already has this name.",
  "Groupe enregistre.": "Group saved.",
  "Le mot de passe doit contenir au moins 8 caracteres.":
    "The password must contain at least 8 characters.",
  "Les deux mots de passe ne correspondent pas.": "The two passwords do not match.",
  "Un compte utilise deja cette adresse.": "An account already uses this address.",
  "Cette personne est deja liee a un autre compte.":
    "This person is already linked to another account.",
  "Erreur lors de l'enregistrement du compte.": "Error while saving the account.",
  "Compte enregistre.": "Account saved.",
  "Choisissez un mode de restauration.": "Choose a restore mode.",
  "Selectionnez un fichier de sauvegarde (.json).": "Select a backup file (.json).",
  "Fichier trop volumineux (20 Mo maximum).": "File too large (20 MB maximum).",
  "Le fichier de sauvegarde est illisible (JSON invalide).":
    "The backup file cannot be read (invalid JSON).",
  "Adresse de reponse invalide.": "Invalid reply-to address.",
  "Configuration SMTP enregistree.": "SMTP configuration saved.",
  "Semaine invalide.": "Invalid week.",
  "Date invalide.": "Invalid date.",
  "Donnees invalides.": "Invalid data.",
  "Lien d'activation invalide ou expire. Demandez un nouveau lien.":
    "Invalid or expired activation link. Request a new link.",
  "Lien de reinitialisation invalide ou expire. Demandez un nouveau lien.":
    "Invalid or expired reset link. Request a new link.",
  "Ce compte est desactive. Contactez un administrateur.":
    "This account is disabled. Contact an administrator.",
  "Votre compte est active. Vous pouvez maintenant vous connecter.":
    "Your account is activated. You can now sign in.",
  "Votre mot de passe a ete modifie. Vous pouvez vous connecter.":
    "Your password has been changed. You can sign in.",
  "Si un compte correspond a cette adresse, un email de reinitialisation vient d'etre envoye.":
    "If an account matches this address, a reset email has just been sent.",
  "Adresse email invalide.": "Invalid email address.",
  "L'envoi de l'email a echoue (configuration SMTP). Contactez un administrateur pour reinitialiser votre mot de passe.":
    "Sending the email failed (SMTP configuration). Contact an administrator to reset your password.",
  "Session expiree. Reconnectez-vous.": "Session expired. Please sign in again.",
  "Compte introuvable.": "Account not found.",
  "Mot de passe actuel incorrect.": "Current password is incorrect.",
  "Votre mot de passe a ete modifie.": "Your password has been changed.",
  "Semaine remplie.": "Week filled.",
  "Aucune permanence pour cette semaine.": "No shift for this week.",
  "L'invitation a ete envoyee.": "The invitation has been sent.",
};

export type TranslationVars = Record<string, string | number>;

export type Translator = (message: string, vars?: TranslationVars) => string;

export function formatMessage(template: string, vars?: TranslationVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = vars[name];
    return value === undefined ? match : String(value);
  });
}

export function createTranslator(locale: Locale): Translator {
  return (message, vars) => {
    const template = locale === "en" ? EN_MESSAGES[message] ?? message : message;
    return formatMessage(template, vars);
  };
}
