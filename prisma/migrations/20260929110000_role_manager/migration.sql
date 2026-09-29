-- Ajout du role Gestionnaire (acces au planning, personnel, groupes et envoi d'emails)
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'MANAGER';
