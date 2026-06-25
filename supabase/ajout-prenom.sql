-- =============================================================================
-- Migration : ajoute la colonne "prenom" à clients + renseigne les comptes démo.
-- À lancer une fois dans Supabase → SQL Editor (sans tout réinitialiser).
-- =============================================================================
alter table clients add column if not exists prenom text;

update clients set prenom = 'Lucas', nom = 'Bernard' where email = 'client1@email.fr';
update clients set prenom = 'Emma',  nom = 'Durand'  where email = 'client2@email.fr';
update clients set prenom = 'Marie', nom = 'Dubois'  where email = 'marie.dubois@email.fr';
update clients set prenom = 'Paul',  nom = 'Martin'  where email = 'paul.martin@email.fr';
