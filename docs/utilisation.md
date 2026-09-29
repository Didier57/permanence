# Utilisation

## Connexion

Se connecter avec son email et son mot de passe. La deconnexion se fait via le menu lateral.

## Personnel

Menu **Personnel** : creer, modifier et rechercher les membres du personnel.
Chaque personne possede un nom, un prenom, un telephone professionnel, un telephone prive, un email
et peut appartenir a **plusieurs groupes** (elle apparait alors dans chacun d'eux dans le planning).

Une personne ayant deja des permanences n'est pas supprimee physiquement : elle est **desactivee**
afin de conserver l'historique.

## Groupes

Menu **Groupes** : creer, modifier et supprimer des groupes (nom, description, couleur, membres).
Un groupe ayant des permanences ne peut pas etre supprime.

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

Lorsqu'un planning deja envoye est modifie, l'application affiche
« Le planning a deja ete envoye. Renvoyer le planning mis a jour ? » et laisse
l'administrateur decider du renvoi. Plusieurs modifications successives n'entrainent qu'**un seul**
nouvel envoi complet.

## Emails

Menu **Emails** :

- **Configuration SMTP** : parametres du serveur, expediteur, CC, jour/heure d'envoi, activation.
  Le bouton **Tester la configuration SMTP** envoie un message de verification.
- **Envoi manuel** : choisir une date pour envoyer la planification de la semaine ISO correspondante.

Chaque personne concernee recoit **un seul** email contenant **l'integralite** du planning de la semaine
(tous les jours et tous les groupes), avec pour chaque permanence le groupe, l'utilisateur, le telephone
et l'email.

## Historique

Menu **Historique** : liste des envois (date/heure, semaine, periode, type, destinataires, CC, statut, erreur).
