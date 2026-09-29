# Utilisation

## Connexion

Se connecter avec son email et son mot de passe. La deconnexion se fait via le menu lateral.

Un lien **Mot de passe oublie ?** permet de recevoir par email un lien de reinitialisation
valable 72 heures. L'ancien mot de passe reste valable tant que la reinitialisation n'a pas ete
terminee ; des qu'une connexion reussit avec l'ancien mot de passe, le lien en attente est annule.

Le menu **Mon compte** (accessible a tous les roles) affiche les informations de connexion et
permet de changer son propre mot de passe.

## Roles et acces

Chaque personne peut avoir, dans **Personnel**, un champ **Acces a l'application** :

- **Aucun acces** : la personne existe dans le personnel mais ne peut pas se connecter.
- **Utilisateur (lecture seule)** : consulte uniquement le planning (semaine et mois), sans rien modifier.
- **Gestionnaire** : gere le planning, le personnel (ajout, modification, suppression, invitation et
  reinitialisation de mot de passe), les groupes (ajout, modification, suppression) et l'envoi des emails.
- **Administrateur** : acces complet, y compris la configuration SMTP, les comptes d'acces, l'adresse du
  site et la sauvegarde/restauration.

Un **Utilisateur** ne peut pas modifier le planning : le glisser-deposer est desactive pour lui. La
configuration SMTP et les comptes d'acces restent reserves aux administrateurs.

## Invitations et reinitialisation

Depuis **Personnel**, le bouton **Inviter** (ou **Renvoyer l'invitation** / **Reinitialiser le
mot de passe**) envoie a la personne un email contenant un lien unique valable 72 heures.
Elle y definit elle-meme son mot de passe : aucun mot de passe ne circule par email.

Si l'envoi de l'email echoue, l'application affiche le lien a transmettre manuellement.
L'invitation est possible seulement si la configuration SMTP est renseignee (menu **Emails**).

## Personnel

Menu **Personnel** : creer, modifier et rechercher les membres du personnel.
Chaque personne possede un nom, un prenom, un telephone professionnel, un telephone prive, un email
et peut appartenir a **plusieurs groupes** (elle apparait alors dans chacun d'eux dans le planning).

Une personne ayant deja des permanences n'est pas supprimee physiquement : elle est **desactivee**
afin de conserver l'historique.

## Groupes

Menu **Groupes** : creer, modifier et supprimer des groupes (nom, description, couleur, membres).
La couleur se choisit avec un **selecteur de couleur** (nuancier predefini ou couleur libre) et sert de
repere dans le planning. Un groupe ayant des permanences ne peut pas etre supprime.

## Planning

Le planning affiche a gauche la liste des groupes et de leurs membres, et a droite le calendrier.
Toute personne affichee peut etre **glissee-deposee**.

### Vue Semaine

- Le numero de **semaine ISO** et la periode (du lundi au dimanche) sont affiches.
- Deposer un utilisateur sur un jour enregistre la permanence **immediatement**.
- Deposer un utilisateur sur un jour deja occupe **remplace** la personne presente.
- La croix sur une permanence la supprime.
- Navigation : semaine precedente / suivante, bouton **Aujourd'hui**, selection directe d'une date.

### Vue Mois

- Chaque ligne correspond a une semaine et affiche son numero.
- Deposer un utilisateur sur la colonne de gauche d'une semaine l'affecte aux **7 jours** de cette semaine.
  Si la semaine contient deja des permanences pour ce groupe, une confirmation de remplacement est demandee.

### Renvoi apres modification

Lorsqu'un planning deja envoye est modifie, aucune fenetre ne s'ouvre : un avertissement rouge
**« La modification de la semaine en cours n'a pas ete envoyee. »** s'affiche a l'extremite gauche
de la barre d'outils de la vue Semaine.

Pour renvoyer le planning mis a jour, l'administrateur clique sur **Envoyer la semaine par email** :
l'envoi porte alors la mention **`(UPDATE)`** dans l'objet, par exemple
`Permanence semaine 42 du 12/10/2026 à 18/10/2026 (UPDATE)`, et l'avertissement disparait.
Plusieurs modifications successives n'entrainent qu'**un seul** nouvel envoi complet.

## Emails

Menu **Emails** :

- **Configuration SMTP** : parametres du serveur, expediteur, CC, jour/heure d'envoi, activation.
  Le bouton **Tester la configuration SMTP** envoie un message de verification.
- **Modele du message** (administrateur) : deux zones de texte mises en forme, inserees dans chaque email :
  - **Texte au-dessus du planning** : place juste apres le numero de semaine et les dates, avant la liste des groupes.
  - **Texte en dessous du planning** : place apres la liste des groupes, en fin d'email.

  L'editeur permet de mettre en gras, italique, souligne, de changer la **police**, la **taille**, la
  **couleur du texte**, de surligner, d'inserer des **liens**, des titres, des listes et des alignements.
  Un lien insere est affiche en bleu et souligne ; sa couleur reste modifiable avec les pastilles de
  couleur. Le collage conserve la mise en forme et les liens du texte copie (le contenu colle est nettoye
  de la meme facon). Le bouton **HTML** bascule vers le code source pour une retouche manuelle. Le contenu
  est nettoye automatiquement (scripts et attributs dangereux supprimes). Laissez une zone vide pour ne
  rien ajouter.
- **Envoi manuel** : choisir une date pour envoyer la planification de la semaine ISO correspondante.

Chaque personne concernee recoit **un seul** email contenant **l'integralite** du planning de la semaine,
presente **par groupe** : les jours consecutifs d'une meme personne sont regroupes sur une seule ligne
(par exemple `Lundi a Dimanche : Jean Dupont`). Une ligne supplementaire n'apparait que s'il y a une
exception (par exemple `Lundi a Vendredi : Didier` puis `Samedi a Dimanche : Volker`). Chaque ligne
indique aussi le telephone et l'email de la personne. Le titre de chaque bloc est le nom du groupe,
suivi de sa description entre parentheses lorsqu'une description est renseignee
(par exemple `On-duty UC-LE (Astreinte equipement)`).

## Historique

Menu **Historique** : liste des envois (date/heure, semaine, periode, type, destinataires, CC, statut, erreur).

## Sauvegarde et restauration

Menu **Sauvegarde** (administrateurs) : exporte un fichier JSON contenant le **personnel**, les **comptes
d'acces** (empreinte des mots de passe, role, etat), les **groupes** et leurs membres, le **planning**,
la **configuration email** (SMTP, CC, jour et heure d'envoi) et l'**adresse du site**. L'historique des
emails n'est pas inclus.

- **Telecharger la sauvegarde** enregistre le fichier JSON. Conservez-le dans un emplacement protege :
  il permet de recreer les comptes avec leurs mots de passe actuels.
- **Restaurer** propose deux modes :
  - **Mise a jour** : chaque enregistrement du fichier est ajoute ou met a jour ; les donnees
    actuelles qui ne figurent pas dans la sauvegarde sont conservees.
  - **Restauration complete** : le contenu actuel (personnel, groupes, planning) est **supprime**
    avant l'import. Une confirmation explicite est demandee.

Dans les deux modes, les comptes d'acces du fichier sont crees ou mis a jour et les comptes existants ne
sont jamais supprimes ; un compte dont la personne est retrouvee par son email est relie a nouveau. La
restauration est refusee si elle ne laisserait aucun administrateur actif.

Ce mecanisme complete le dump PostgreSQL decrit dans [Sauvegarde et restauration](sauvegarde-restauration.md).
