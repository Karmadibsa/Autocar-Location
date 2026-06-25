-- =============================================================================
-- NeoTravel — RESET COMPLET (à lancer dans Supabase → SQL Editor)
-- Supprime TOUT (tables + types) puis recrée le schéma propre + données de démo.
-- Ne touche PAS aux comptes auth.users (tes connexions restent valides).
-- =============================================================================

drop table if exists conversations, relances, devis, demandes, clients, pricing_config, profiles cascade;
drop type  if exists statut_demande, statut_devis, type_relance cascade;
drop function if exists is_admin cascade;

create extension if not exists pgcrypto;

-- ---------- ENUMS ----------
create type statut_demande as enum
  ('nouveau_lead','incomplete','qualifiee','devis_envoye','relance_1','relance_2','accepte','refuse','cas_complexe','cloture');
create type statut_devis as enum ('brouillon','envoye','accepte','refuse','expire');
create type type_relance as enum ('J2','J3','J7');

-- ---------- TABLES ----------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'client' check (role in ('client','admin')),
  created_at timestamptz not null default now()
);
create function is_admin() returns boolean language sql stable security definer as $$
  select exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'); $$;

create table clients (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  email text not null, type_client text, nom text, telephone text,
  consentement boolean not null default false, created_at timestamptz not null default now()
);
create unique index clients_email_key on clients (lower(email));

create table demandes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  depart text, destination text, date_depart date, date_retour date,
  aller_retour boolean not null default false, nb_passagers integer, type_trajet text,
  urgence text, distance_km numeric, options jsonb not null default '[]'::jsonb,
  statut statut_demande not null default 'nouveau_lead', score_completude integer,
  commentaire text, created_at timestamptz not null default now()
);

create table devis (
  id uuid primary key default gen_random_uuid(),
  demande_id uuid references demandes(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  prix_ht numeric, tva numeric, prix_ttc numeric, devise text not null default 'EUR',
  lignes jsonb not null default '[]'::jsonb, coefficients jsonb not null default '[]'::jsonb,
  statut statut_devis not null default 'brouillon', pdf_url text, date_envoi timestamptz,
  prochaine_relance timestamptz, nb_relances integer not null default 0,
  created_at timestamptz not null default now()
);

create table relances (
  id uuid primary key default gen_random_uuid(),
  devis_id uuid references devis(id) on delete cascade,
  type type_relance not null, date_planifiee timestamptz not null,
  statut text not null default 'planifiee', date_envoi timestamptz,
  cle_idempotence text not null, created_at timestamptz not null default now()
);
create unique index relances_idem_key on relances(cle_idempotence);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  demande_id uuid references demandes(id) on delete set null,
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table pricing_config (id integer primary key default 1 check (id = 1), data jsonb not null, updated_at timestamptz not null default now());
insert into pricing_config (id, data) values (1, '{
  "devise":"EUR",
  "grille_forfait":[{"max_km":30,"prix":250},{"max_km":40,"prix":320},{"max_km":50,"prix":350},{"max_km":60,"prix":390},{"max_km":70,"prix":430},{"max_km":80,"prix":500},{"max_km":90,"prix":540},{"max_km":100,"prix":580},{"max_km":110,"prix":620},{"max_km":120,"prix":660},{"max_km":130,"prix":700},{"max_km":140,"prix":740},{"max_km":150,"prix":780},{"max_km":160,"prix":820},{"max_km":170,"prix":860},{"max_km":180,"prix":900}],
  "longue_distance":{"seuil_km":180,"multiplicateur_distance":2,"prix_km":2.5},
  "saison_par_mois":{"1":{"niveau":"basse","coef":-0.07},"2":{"niveau":"basse","coef":-0.07},"8":{"niveau":"basse","coef":-0.07},"11":{"niveau":"basse","coef":-0.07},"9":{"niveau":"moyenne","coef":0},"10":{"niveau":"moyenne","coef":0},"12":{"niveau":"moyenne","coef":0},"3":{"niveau":"haute","coef":0.10},"4":{"niveau":"haute","coef":0.10},"7":{"niveau":"haute","coef":0.10},"5":{"niveau":"tres_haute","coef":0.15},"6":{"niveau":"tres_haute","coef":0.15}},
  "pondation_date":[{"max_jours":6,"code":"DD_PRIORITAIRE","coef":0.10},{"max_jours":29,"code":"DD_URGENT","coef":0.05},{"max_jours":89,"code":"DD_NORMAL","coef":-0.05},{"max_jours":100000,"code":"DD_3MOISETPLUS","coef":-0.10}],
  "pondation_capacite":[{"max":19,"coef":-0.05},{"max":53,"coef":0},{"max":63,"coef":0.15},{"max":67,"coef":0.20},{"max":85,"coef":0.40}],
  "seuil_escalade_passagers":85,"options":{"guide":80,"nuit_chauffeur":120,"peages":0},"marge":0.15,"tva":0.10
}'::jsonb);

-- ---------- RLS ----------
alter table profiles enable row level security;
alter table clients enable row level security;
alter table demandes enable row level security;
alter table devis enable row level security;
alter table relances enable row level security;
alter table conversations enable row level security;
create policy profiles_self on profiles for select using (id = auth.uid() or is_admin());
create policy clients_select on clients for select using (auth_user_id = auth.uid() or is_admin());
create policy demandes_select on demandes for select using (is_admin() or client_id in (select id from clients where auth_user_id = auth.uid()));
create policy devis_select on devis for select using (is_admin() or client_id in (select id from clients where auth_user_id = auth.uid()));
create policy conversations_select on conversations for select using (is_admin() or client_id in (select id from clients where auth_user_id = auth.uid()));
create policy relances_admin on relances for select using (is_admin());

-- ---------- (Re)définir les rôles admin pour les comptes existants ----------
insert into profiles (id, role) select id, 'admin' from auth.users where email = 'admin@neotravel.fr'
  on conflict (id) do update set role = 'admin';

-- ---------- DONNÉES DE DÉMO (couvre tous les statuts du pipeline) ----------
insert into clients (id, email, type_client, nom, telephone, consentement) values
 ('c1000000-0000-0000-0000-000000000001','client1@email.fr','particulier','Client Un','0600000001',true),
 ('c2000000-0000-0000-0000-000000000002','client2@email.fr','particulier','Client Deux','0600000002',true),
 ('c3000000-0000-0000-0000-000000000003','marie.dubois@email.fr','entreprise','Marie Dubois','0600000003',true),
 ('c4000000-0000-0000-0000-000000000004','paul.martin@email.fr','particulier','Paul Martin','0600000004',true);

-- 1) EN ATTENTE + relance DUE maintenant (démo relance)
insert into demandes (id, client_id, depart, destination, date_depart, aller_retour, nb_passagers, distance_km, urgence, statut, created_at) values
 ('d1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000001','Lyon','Annecy','2026-07-12',true,50,139,'normal','devis_envoye', now() - interval '1 day');
insert into devis (id, demande_id, client_id, prix_ht, tva, prix_ttc, devise, lignes, coefficients, statut, date_envoi, prochaine_relance, nb_relances, created_at) values
 ('e1000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000001',1957.30,195.73,2153.03,'EUR',
  '[{"libelle":"Forfait transfert 139 km","montant":740},{"libelle":"Aller/retour (x2)","montant":740},{"libelle":"Coefficients (x1.15)","montant":222},{"libelle":"Marge +15%","montant":255.30}]'::jsonb,
  '[{"libelle":"Saison (haute)","valeur":0.10},{"libelle":"Anticipation (DD_URGENT)","valeur":0.05}]'::jsonb,'envoye', now() - interval '1 day', now() - interval '1 hour', 0, now() - interval '1 day');
insert into conversations (id, client_id, demande_id, messages, updated_at) values
 ('f1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000001',
  '[{"role":"agent","content":"Bonjour, quel est votre besoin ?"},{"role":"user","content":"Lyon vers Annecy, 50 personnes le 12 juillet aller-retour"},{"role":"agent","content":"Votre devis est disponible."}]'::jsonb, now() - interval '1 day');

-- 2) GAGNÉ
insert into demandes (id, client_id, depart, destination, date_depart, aller_retour, nb_passagers, distance_km, urgence, statut, created_at) values
 ('d2000000-0000-0000-0000-000000000002','c3000000-0000-0000-0000-000000000003','Bordeaux','Biarritz','2026-09-05',true,45,185,'normal','accepte', now() - interval '6 days');
insert into devis (id, demande_id, client_id, prix_ht, tva, prix_ttc, devise, lignes, coefficients, statut, date_envoi, nb_relances, created_at) values
 ('e2000000-0000-0000-0000-000000000002','d2000000-0000-0000-0000-000000000002','c3000000-0000-0000-0000-000000000003',1180.00,118.00,1298.00,'EUR',
  '[{"libelle":"Longue distance 185 km","montant":925},{"libelle":"Coefficients (x1.05)","montant":101.25},{"libelle":"Marge +15%","montant":153.75}]'::jsonb,
  '[{"libelle":"Saison (moyenne)","valeur":0}]'::jsonb,'accepte', now() - interval '6 days', 0, now() - interval '6 days');

-- 3) PERDU (refusé)
insert into demandes (id, depart, destination, date_depart, aller_retour, nb_passagers, distance_km, urgence, statut, created_at) values
 ('d3000000-0000-0000-0000-000000000003','Marseille','Avignon','2026-05-10',true,60,100,'normal','refuse', now() - interval '5 days');
insert into devis (id, demande_id, prix_ht, tva, prix_ttc, devise, lignes, coefficients, statut, date_envoi, nb_relances, created_at) values
 ('e3000000-0000-0000-0000-000000000003','d3000000-0000-0000-0000-000000000003',1240.00,124.00,1364.00,'EUR',
  '[{"libelle":"Forfait transfert 100 km","montant":580},{"libelle":"Aller/retour (x2)","montant":580},{"libelle":"Coefficients (x1.15)","montant":174},{"libelle":"Marge +15%","montant":143.40}]'::jsonb,
  '[{"libelle":"Capacite 60 pax","valeur":0.15}]'::jsonb,'refuse', now() - interval '5 days', 1, now() - interval '5 days');

-- 4) À TRAITER (cas complexes > 85 passagers)
insert into demandes (id, depart, destination, date_depart, aller_retour, nb_passagers, distance_km, urgence, statut, commentaire, created_at) values
 ('d4000000-0000-0000-0000-000000000004','Toulouse','Lourdes','2026-04-18',true,95,180,'normal','cas_complexe','Volume de 95 passagers > 85 : transfert a un commercial.', now() - interval '3 days'),
 ('d4000000-0000-0000-0000-000000000005','Dijon','Beaune','2026-07-12',false,120,45,'urgent','cas_complexe','Volume de 120 passagers > 85 : transfert a un commercial.', now() - interval '4 hours');

-- 5) EN ATTENTE — relance 1
insert into demandes (id, client_id, depart, destination, date_depart, aller_retour, nb_passagers, distance_km, urgence, statut, created_at) values
 ('d5000000-0000-0000-0000-000000000006','c4000000-0000-0000-0000-000000000004','Lille','Bruxelles','2026-09-10',true,30,110,'normal','relance_1', now() - interval '4 days');
insert into devis (id, demande_id, client_id, prix_ht, tva, prix_ttc, devise, lignes, coefficients, statut, date_envoi, prochaine_relance, nb_relances, created_at) values
 ('e5000000-0000-0000-0000-000000000006','d5000000-0000-0000-0000-000000000006','c4000000-0000-0000-0000-000000000004',860.00,86.00,946.00,'EUR',
  '[{"libelle":"Forfait transfert 110 km","montant":620},{"libelle":"Coefficients (x1.05)","montant":31},{"libelle":"Marge +15%","montant":97.65}]'::jsonb,
  '[{"libelle":"Anticipation (DD_NORMAL)","valeur":-0.05}]'::jsonb,'envoye', now() - interval '4 days', now() + interval '3 days', 1, now() - interval '4 days');

-- 6) EN ATTENTE — relance 2
insert into demandes (id, depart, destination, date_depart, aller_retour, nb_passagers, distance_km, urgence, statut, created_at) values
 ('d6000000-0000-0000-0000-000000000007','Nantes','La Baule','2026-10-02',true,12,75,'normal','relance_2', now() - interval '8 days');
insert into devis (id, demande_id, prix_ht, tva, prix_ttc, devise, lignes, coefficients, statut, date_envoi, prochaine_relance, nb_relances, created_at) values
 ('e6000000-0000-0000-0000-000000000007','d6000000-0000-0000-0000-000000000007',540.00,54.00,594.00,'EUR',
  '[{"libelle":"Forfait transfert 75 km","montant":430},{"libelle":"Coefficients (x0.95)","montant":-21.50},{"libelle":"Marge +15%","montant":61.50}]'::jsonb,
  '[{"libelle":"Petit groupe 12 pax","valeur":-0.05}]'::jsonb,'envoye', now() - interval '8 days', now() - interval '2 hours', 2, now() - interval '8 days');

-- 7) PERDU — clôturé après 2 relances
insert into demandes (id, depart, destination, date_depart, aller_retour, nb_passagers, distance_km, urgence, statut, created_at) values
 ('d7000000-0000-0000-0000-000000000008','Nice','Monaco','2026-06-28',true,55,25,'normal','cloture', now() - interval '14 days');
insert into devis (id, demande_id, prix_ht, tva, prix_ttc, devise, lignes, coefficients, statut, date_envoi, nb_relances, created_at) values
 ('e7000000-0000-0000-0000-000000000008','d7000000-0000-0000-0000-000000000008',720.00,72.00,792.00,'EUR',
  '[{"libelle":"Forfait transfert 25 km","montant":250},{"libelle":"Aller/retour (x2)","montant":250},{"libelle":"Coefficients (x1.15)","montant":75},{"libelle":"Marge +15%","montant":83.25}]'::jsonb,
  '[{"libelle":"Capacite 55 pax","valeur":0.15}]'::jsonb,'expire', now() - interval '14 days', 2, now() - interval '14 days');

-- 8) Haut de funnel (sans devis) : nouveau lead / qualifiée / incomplète
insert into demandes (id, depart, destination, date_depart, aller_retour, nb_passagers, distance_km, urgence, statut, created_at) values
 ('d8000000-0000-0000-0000-000000000009','Rennes','Saint-Malo','2026-08-15',true,25,70,'normal','nouveau_lead', now() - interval '2 hours'),
 ('d8000000-0000-0000-0000-000000000010','Paris','Deauville','2026-08-20',false,35,200,'normal','qualifiee', now() - interval '2 days'),
 ('d8000000-0000-0000-0000-000000000011','Strasbourg','Colmar',null,false,null,null,'normal','incomplete', now() - interval '1 day');
