-- =============================================================================
-- Migration non destructive vers le schéma récent (sans tout réinitialiser).
-- Ajoute prénom/adresse aux clients + token aux devis, renseigne les comptes
-- démo et garantit le rôle admin. Idempotent : relançable sans risque.
-- =============================================================================
alter table clients add column if not exists prenom text;
alter table clients add column if not exists nom text;
alter table clients add column if not exists adresse text;
alter table clients add column if not exists code_postal text;
alter table clients add column if not exists ville text;
alter table devis   add column if not exists token uuid not null default gen_random_uuid();
alter table devis   add column if not exists raison_refus text;

update clients set prenom='Lucas', nom='Bernard', adresse='12 rue de la République', code_postal='69001', ville='Lyon'    where email='client1@email.fr';
update clients set prenom='Emma',  nom='Durand',  adresse='5 avenue des Fleurs',     code_postal='44000', ville='Nantes'  where email='client2@email.fr';

-- Rôle admin (sinon /admin redirige vers l'espace client)
insert into profiles (id, role) select id, 'admin' from auth.users where email = 'admin@autocar-location.fr'
  on conflict (id) do update set role = 'admin';
